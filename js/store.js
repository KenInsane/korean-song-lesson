// Хранилище проверенных пользователем материалов (localStorage, офлайн, на устройстве).
const KEY = 'ksl_materials_v1';

export function loadAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch (e) { return []; }
}

function saveAll(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function newId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export function addMaterial(m) {
  const list = loadAll();
  list.unshift(m);
  saveAll(list);
  return list;
}

export function updateMaterial(m) {
  const list = loadAll();
  const i = list.findIndex((x) => x.id === m.id);
  if (i >= 0) { list[i] = m; saveAll(list); }
  return list;
}

export function deleteMaterial(id) {
  const list = loadAll().filter((x) => x.id !== id);
  saveAll(list);
  return list;
}

export function getMaterial(id) {
  return loadAll().find((x) => x.id === id) || null;
}
