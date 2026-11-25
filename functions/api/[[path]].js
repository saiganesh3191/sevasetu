const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
})

const db = (ctx) => ctx.env.sevasetu_demo
const body = async (request) => { try { return await request.json() } catch { return {} } }

async function complaints(ctx, request, parts) {
  const method = request.method
  const id = Number(parts[1])
  if (method === 'GET' && id) {
    const row = await db(ctx).prepare('SELECT c.*, v.name AS volunteer_name FROM complaints c LEFT JOIN volunteers v ON v.id=c.volunteer_id WHERE c.id=?').bind(id).first()
    if (!row) return json({ detail: 'Complaint not found' }, 404)
    const updates = await db(ctx).prepare('SELECT * FROM complaint_updates WHERE complaint_id=? ORDER BY id DESC').bind(id).all()
    return json({ ...row, updates: updates.results })
  }
  if (method === 'GET') {
    const q = new URL(request.url).searchParams
    let sql = 'SELECT c.*, v.name AS volunteer_name FROM complaints c LEFT JOIN volunteers v ON v.id=c.volunteer_id WHERE 1=1'
    const args = []
    for (const key of ['status','category','priority','district','constituency']) if (q.get(key)) { sql += ` AND c.${key}=?`; args.push(q.get(key)) }
    if (q.get('search')) { sql += ' AND (c.ticket_no LIKE ? OR c.citizen_name LIKE ? OR c.subject LIKE ?)'; args.push(...Array(3).fill(`%${q.get('search')}%`)) }
    const rows = await db(ctx).prepare(sql + ' ORDER BY c.id DESC').bind(...args).all()
    return json(rows.results)
  }
  if (method === 'POST') {
    const d = await body(request)
    const r = await db(ctx).prepare(`INSERT INTO complaints (citizen_name,phone,category,subject,description,district,constituency,village,mandal,source,voter_id,priority,ticket_no) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(d.citizen_name,d.phone,d.category,d.subject,d.description||'',d.district,d.constituency||'',d.village||'',d.mandal||'',d.source||'Walk-in',(d.voter_id||'').toUpperCase(),d.priority||'Medium',`GRV-${Date.now().toString().slice(-5)}`).run()
    return json({ id: r.meta.last_row_id, ...d, ticket_no: `GRV-${Date.now().toString().slice(-5)}`, status: 'Open', updates: [] }, 201)
  }
  if ((method === 'PATCH' || method === 'DELETE') && id) {
    if (method === 'DELETE') { await db(ctx).prepare('DELETE FROM complaints WHERE id=?').bind(id).run(); return new Response(null, { status: 204 }) }
    const d = await body(request); const sets = []; const args = []
    for (const key of ['status','priority','volunteer_id']) if (d[key] !== undefined) { sets.push(`${key}=?`); args.push(d[key] || null) }
    if (sets.length) await db(ctx).prepare(`UPDATE complaints SET ${sets.join(',')},updated_at=datetime('now') WHERE id=?`).bind(...args,id).run()
    const row = await db(ctx).prepare('SELECT c.*, v.name AS volunteer_name FROM complaints c LEFT JOIN volunteers v ON v.id=c.volunteer_id WHERE c.id=?').bind(id).first()
    return json({ ...row, updates: [] })
  }
  return json({ detail: 'Method not allowed' }, 405)
}

async function volunteers(ctx, request, parts) {
  const id = Number(parts[1]); const method = request.method
  if (method === 'GET') {
    const rows = await db(ctx).prepare(`SELECT v.*, (SELECT COUNT(*) FROM complaints c WHERE c.volunteer_id=v.id) total_assigned, (SELECT COUNT(*) FROM complaints c WHERE c.volunteer_id=v.id AND c.status IN ('Open','In Progress','On Hold')) active_cases, (SELECT COUNT(*) FROM complaints c WHERE c.volunteer_id=v.id AND c.status='Completed') resolved_cases FROM volunteers v ORDER BY v.name`).all()
    return json(rows.results)
  }
  if (method === 'POST') { const d = await body(request); const r = await db(ctx).prepare('INSERT INTO volunteers (name,phone,email,district,skills,status) VALUES (?,?,?,?,?,?)').bind(d.name,d.phone,d.email||'',d.district,d.skills||'',d.status||'Active').run(); return json({ id:r.meta.last_row_id, ...d },201) }
  if (method === 'PATCH' && id) { const d=await body(request); const keys=['name','phone','email','district','skills','status'].filter(k=>d[k]!==undefined); await db(ctx).prepare(`UPDATE volunteers SET ${keys.map(k=>`${k}=?`).join(',')} WHERE id=?`).bind(...keys.map(k=>d[k]),id).run(); return json({id,...d}) }
  if (method === 'DELETE' && id) { await db(ctx).prepare('DELETE FROM volunteers WHERE id=?').bind(id).run(); return new Response(null,{status:204}) }
  return json({ detail: 'Method not allowed' },405)
}

export async function onRequest(context) {
  const { request, params } = context
  if (request.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin':'*', 'access-control-allow-methods':'GET,POST,PATCH,PUT,DELETE,OPTIONS', 'access-control-allow-headers':'*' } })
  const path = (params.path || '').split('/').filter(Boolean)
  if (path[0] === 'auth') {
    if (path[1] === 'login') return json({ token: 'demo-token', user: { username: 'admin', full_name: 'Office Admin' } })
    if (path[1] === 'logout') return json({ ok: true })
    if (path[1] === 'profile' && request.method === 'PUT') return json(await body(request))
  }
  if (path[0] === 'complaints') return complaints(context, request, path)
  if (path[0] === 'volunteers') return volunteers(context, request, path)
  if (path[0] === 'dashboard') {
    const c=(await db(context).prepare("SELECT COUNT(*) total, SUM(status='Open') open, SUM(status='Completed') completed FROM complaints").first())
    const v=(await db(context).prepare("SELECT COUNT(*) total, SUM(status='Active') active FROM volunteers").first())
    return json({ complaints:c, volunteers:v, by_category:[], by_district:[], by_status:[], status_by_district:{}, volunteers_by_district:[], category_district:{}, trend:[], recent:[] })
  }
  if (path[0] === 'reports') return json({ summary:{total:0,resolved:0,pending:0,avg_resolution_days:0,resolution_rate:0},by_district:[],by_category:[],by_priority:[],volunteer_performance:[] })
  if (path[0] === 'constituencies') return json({ total_constituencies:0,total_districts:0,unmapped_complaints:0,districts:[] })
  return json({ detail: 'Not found' }, 404)
}
