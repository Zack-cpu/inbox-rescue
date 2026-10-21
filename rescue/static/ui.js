let session, items = [];
const $ = id => document.getElementById(id);
function element(tag, text, cls) {
  const e = document.createElement(tag); e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
async function api(path) {
  const r = await fetch(path, {method:'POST', headers:{'x-rescue-token':session.token}});
  const data = await r.json();
  if (!r.ok) throw new Error(data.detail || '操作未完成，请重试');
  return data;
}
function render() {
  $('items').replaceChildren();
  const shown = items.filter(m => $('all').checked || m.candidate);
  for (const m of shown) {
    const card = element('article', '');
    card.append(element('span', `${m.sender} · ${m.labels.includes('SPAM') ? 'Spam' : 'Promotions'}`, 'sender'));
    card.append(element('h3', m.subject));
    for (const r of m.reasons) card.append(element('p', '↳ ' + r, 'reason'));
    if (!m.reasons.length) card.append(element('p', '未发现近期往来依据；这不代表邮件一定不重要。'));
    for (const w of m.warnings) card.append(element('p', '注意：' + w, 'warning'));
    const actions = element('div', '', 'actions');
    if (!session.demo) {
      const link = element('a', '在 Gmail 中查看');
      link.href = 'https://mail.google.com/mail/u/0/#all/' + encodeURIComponent(m.id);
      link.target = '_blank'; link.rel = 'noopener noreferrer'; actions.append(link);
    }
    const restore = element('button', m.action !== undefined ? '撤销恢复' : '恢复到主要收件箱');
    restore.onclick = async () => {
      if (m.action === undefined && !confirm(session.demo ? '模拟恢复这封演示邮件？' : '确认已核实发件人？这会移除垃圾/推广分类并放入主要收件箱。')) return;
      restore.disabled = true;
      try {
        if (m.action !== undefined) { await api('/api/undo/' + m.action); delete m.action; }
        else { const result = await api('/api/restore/' + encodeURIComponent(m.id)); m.action = result.action_id; }
        $('status').textContent = session.demo ? '演示操作完成，真实邮箱未改变。' : '操作完成。撤销入口保留到刷新或重新扫描前。';
        render();
      } catch (e) { $('status').textContent = e.message; }
      finally { restore.disabled = false; }
    };
    const ignore = element('button', '本次忽略', 'secondary');
    ignore.onclick = () => { items = items.filter(x => x !== m); render(); };
    actions.append(restore, ignore); card.append(actions); $('items').append(card);
  }
  if (!shown.length) $('items').append(element('p', '没有符合当前筛选条件的邮件。可勾选“显示所有”人工复查。'));
}
$('all').onchange = render;
$('scan').disabled = true;
$('scan').onclick = async () => {
  $('scan').disabled = true; $('status').textContent = '正在检查邮件与近期往来，请稍候…';
  try {
    const result = await api('/api/scan'); items = result.items; render();
    $('status').textContent = `已检查 ${result.checked} 封，${items.filter(m => m.candidate).length} 封有近期往来依据。` + (result.limited ? ' 已达到扫描上限，结果不完整。' : '') + ' 规则可能漏判，请结合所有邮件复查。';
  } catch (e) { $('status').textContent = e.message; }
  finally { $('scan').disabled = false; }
};
fetch('/api/session').then(r => {if (!r.ok) throw Error(); return r.json();}).then(s => {
  session = s; $('mode').textContent = s.demo ? '演示模式' : 'Gmail · 本地模式'; $('scan').disabled = false;
  if (!s.demo) $('status').textContent = '已启用 Gmail 模式，点击按钮检查。请确保 Gmail 页面登录的是已授权账号。';
}).catch(() => { $('status').textContent = '无法连接本地服务，请刷新重试。'; });
