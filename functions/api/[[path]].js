const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
})

const db = (ctx) => ctx.env.sevasetu_demo
const body = async (request) => { try { return await request.json() } catch { return {} } }
const DISTRICTS = ['Hyderabad','Rangareddy','Medchal-Malkajgiri','Warangal','Karimnagar','Khammam','Nalgonda','Nizamabad']
const CATEGORIES = ['Roads & Drainage','Drinking Water','Education','Healthcare','Employment & Skill Development','Agriculture','Public Transport','Municipal Services']
const STATUSES = ['Open','In Progress','On Hold','Completed','Rejected']
const CONSTITUENCIES = { Hyderabad:['Khairatabad','Jubilee Hills','Secunderabad','Charminar','Malakpet','Amberpet'], Rangareddy:['Rajendranagar','Serilingampally','LB Nagar','Ibrahimpatnam','Maheshwaram','Chevella'], 'Medchal-Malkajgiri':['Malkajgiri','Medchal','Quthbullapur','Kukatpally','Uppal'], Warangal:['Warangal East','Narsampet','Wardhannapet'], Karimnagar:['Karimnagar','Choppadandi','Manakondur','Huzurabad'], Khammam:['Khammam','Palair','Madhira','Wyra','Sathupalli'], Nalgonda:['Nalgonda','Nakrekal','Miryalaguda','Devarakonda','Munugode'], Nizamabad:['Nizamabad Urban','Nizamabad Rural','Armur','Bodhan','Balkonda'] }
const pending = (s) => ['Open','In Progress','On Hold'].includes(s)

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
    if (d.note || d.status || d.priority || d.volunteer_id !== undefined) {
      const note = d.note || (d.status ? `Status changed to ${d.status}` : d.priority ? `Priority set to ${d.priority}` : 'Complaint updated')
      await db(ctx).prepare('INSERT INTO complaint_updates (complaint_id,note,status) VALUES (?,?,?)').bind(id,note,d.status||null).run()
    }
    const row = await db(ctx).prepare('SELECT c.*, v.name AS volunteer_name FROM complaints c LEFT JOIN volunteers v ON v.id=c.volunteer_id WHERE c.id=?').bind(id).first()
    const updates = await db(ctx).prepare('SELECT * FROM complaint_updates WHERE complaint_id=? ORDER BY id DESC').bind(id).all()
    return json({ ...row, updates: updates.results })
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
    const [cr, vr] = await Promise.all([db(context).prepare('SELECT c.*, v.name volunteer_name FROM complaints c LEFT JOIN volunteers v ON v.id=c.volunteer_id ORDER BY c.id DESC').all(), db(context).prepare('SELECT * FROM volunteers ORDER BY name').all()])
    const cs = cr.results, vs = vr.results; const empty = (name) => ({ name, total:0, pending:0, completed:0, rejected:0 })
    const by_category = CATEGORIES.map(name => { const x=cs.filter(c=>c.category===name); return { ...empty(name), total:x.length, pending:x.filter(c=>pending(c.status)).length, completed:x.filter(c=>c.status==='Completed').length } })
    const by_district = DISTRICTS.map(name => { const x=cs.filter(c=>c.district===name); return { ...empty(name), total:x.length, pending:x.filter(c=>pending(c.status)).length, completed:x.filter(c=>c.status==='Completed').length, rejected:x.filter(c=>c.status==='Rejected').length } })
    const volunteers_by_district = DISTRICTS.map(name => ({ name, total:vs.filter(v=>v.district===name).length, active:vs.filter(v=>v.district===name&&v.status==='Active').length }))
    const by_status = STATUSES.map(name => ({ name, value:cs.filter(c=>c.status===name).length }))
    const status_by_district = Object.fromEntries(DISTRICTS.map(d=>[d,STATUSES.map(name=>({name,value:cs.filter(c=>c.district===d&&c.status===name).length}))]))
    const category_district = Object.fromEntries(CATEGORIES.map(cat=>[cat,DISTRICTS.map(d=>{const x=cs.filter(c=>c.category===cat&&c.district===d);return {name:d,total:x.length,pending:x.filter(c=>pending(c.status)).length,completed:x.filter(c=>c.status==='Completed').length}})]))
    return json({ complaints:{total:cs.length,open:cs.filter(c=>c.status==='Open').length,in_progress:cs.filter(c=>c.status==='In Progress').length,on_hold:cs.filter(c=>c.status==='On Hold').length,completed:cs.filter(c=>c.status==='Completed').length,rejected:cs.filter(c=>c.status==='Rejected').length,urgent_pending:cs.filter(c=>c.priority==='Urgent'&&pending(c.status)).length,today:0}, volunteers:{total:vs.length,active:vs.filter(v=>v.status==='Active').length}, by_category, category_district, by_district, status_by_district, volunteers_by_district, by_status, trend:[], recent:cs.slice(0,6) })
  }
  if (path[0] === 'reports' && path[1] === 'export') {
    const rows=(await db(context).prepare('SELECT c.ticket_no,c.citizen_name,c.phone,c.category,c.subject,c.district,c.priority,c.status,v.name volunteer,c.created_at,c.resolved_at FROM complaints c LEFT JOIN volunteers v ON v.id=c.volunteer_id ORDER BY c.id').all()).results
    const csv=[['Ticket','Citizen','Phone','Category','Subject','District','Priority','Status','Volunteer','Created','Resolved'],...rows.map(r=>[r.ticket_no,r.citizen_name,r.phone,r.category,r.subject,r.district,r.priority,r.status,r.volunteer||'',r.created_at,r.resolved_at||''])].map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n')+'\n'
    return new Response(csv,{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="complaints_report.csv"','access-control-allow-origin':'*'}})
  }
  if (path[0] === 'reports') {
    const [cr,vr]=await Promise.all([db(context).prepare('SELECT * FROM complaints ORDER BY id DESC').all(),db(context).prepare('SELECT * FROM volunteers ORDER BY name').all()]); const cs=cr.results,vs=vr.results
    return json({ summary:{total:cs.length,resolved:cs.filter(c=>c.status==='Completed').length,pending:cs.filter(c=>pending(c.status)).length,avg_resolution_days:0,resolution_rate:cs.length?Math.round(100*cs.filter(c=>c.status==='Completed').length/cs.length*10)/10:0}, by_district:DISTRICTS.map(name=>{const x=cs.filter(c=>c.district===name);return {name,total:x.length,resolved:x.filter(c=>c.status==='Completed').length,pending:x.filter(c=>pending(c.status)).length}}), by_category:CATEGORIES.map(name=>{const x=cs.filter(c=>c.category===name);return {name,total:x.length,resolved:x.filter(c=>c.status==='Completed').length}}), by_priority:['Low','Medium','High','Urgent'].map(name=>({name,value:cs.filter(c=>c.priority===name).length})), volunteer_performance:vs.map(v=>{const x=cs.filter(c=>c.volunteer_id===v.id);return {id:v.id,name:v.name,district:v.district,assigned:x.length,resolved:x.filter(c=>c.status==='Completed').length}}) })
  }
  if (path[0] === 'constituencies') {
    const rows=(await db(context).prepare('SELECT district,constituency,status FROM complaints WHERE constituency IS NOT NULL AND constituency != ?').bind('').all()).results
    const districts=Object.entries(CONSTITUENCIES).map(([name,names])=>{const constituencies=names.map(n=>{const x=rows.filter(r=>r.district===name&&r.constituency===n);return {name:n,total:x.length,pending:x.filter(r=>pending(r.status)).length,completed:x.filter(r=>r.status==='Completed').length,rejected:x.filter(r=>r.status==='Rejected').length}});return {name,constituencies,count:constituencies.length,total:constituencies.reduce((a,x)=>a+x.total,0),pending:constituencies.reduce((a,x)=>a+x.pending,0),completed:constituencies.reduce((a,x)=>a+x.completed,0)}})
    return json({total_constituencies:districts.reduce((a,d)=>a+d.count,0),total_districts:districts.length,unmapped_complaints:(await db(context).prepare("SELECT COUNT(*) n FROM complaints WHERE constituency IS NULL OR constituency='' ").first()).n,districts})
  }
  return json({ detail: 'Not found' }, 404)
}
