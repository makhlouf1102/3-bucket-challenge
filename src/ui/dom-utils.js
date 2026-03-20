export function syncKeyedChildren({ container, items, getKey, buildNode, updateNode, removeKey, removeDelay = 240 }) {
  const existing = new Map(Array.from(container.children).map((child) => [child.dataset.key, child]));
  const fragment = document.createDocumentFragment();
  const activeKeys = new Set();

  items.forEach((item) => {
    const key = getKey(item);
    activeKeys.add(key);
    const node = existing.get(key) || buildNode(item);
    updateNode(node, item);
    fragment.appendChild(node);
  });

  Array.from(existing.entries()).forEach(([key, node]) => {
    if (activeKeys.has(key)) {
      return;
    }

    if (removeKey && key === removeKey) {
      node.classList.add('is-exiting');
      fragment.appendChild(node);
      window.setTimeout(() => node.remove(), removeDelay);
      return;
    }

    node.remove();
  });

  container.replaceChildren(fragment);
}

export function syncRows({ tbody, items, getKey, buildRow, updateRow, emptyMarkup, removeKey, removeDelay }) {
  if (!items.length) {
    tbody.innerHTML = emptyMarkup;
    return;
  }

  syncKeyedChildren({
    container: tbody,
    items,
    getKey,
    buildNode: buildRow,
    updateNode: updateRow,
    removeKey,
    removeDelay
  });
}
