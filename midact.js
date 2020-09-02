const TEXT_ELEMENT = "TEXT ELEMENT";
const isEvent = key => key.startsWith("on");
const isProperty = key => key !== 'children' && !isEvent(key);
const isNew = (oldProps, newProps) => key => oldProps[key] != newProps[key];
const isGone = (oldProps, newProps) => key => !(key in newProps);

let nextUnitOfWork = null;
let wipRoot = null;
let currentRoot = null;
let deletions = [];
let wipFiber = null;
let hookIndex = null;

// MAIN LOOP //

requestIdleCallback(workLoop);

function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }
  requestIdleCallback(workLoop);
}

// BUILD FIBER TREE //

function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function;
  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }
  return pickUpNextUnitOfWork(fiber);
}

function updateFunctionComponent(fiber) {
  wipFiber = fiber;
  hookIndex = 0;
  wipFiber.hooks = [];
  let childrens;
  if (fiber.type === Fragment) {
    childrens = fiber.type(fiber.props);
    if (!Array.isArray(childrens)) {
      throw new Error("Fragment need to return array of children");
    }
  } else {
    childrens = [fiber.type(fiber.props)];
      wipFiber.child = newFiber;
    } else {
      prevSiblingFiber.sibling = newFiber;
    }
    prevSiblingFiber = newFiber;
  }
}

function pickUpNextUnitOfWork(fiber) {
  if (fiber.child) {
    return fiber.child;
  }
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
}

// COMMIT AND RE-RENDER //
function commitRoot() {
  deletions.forEach(renderFiberNode);
  renderFiberNode(wipRoot.child);

  currentRoot = wipRoot;
  wipRoot = null;
}

function renderFiberNode(fiber) {
  if (!fiber || !fiber.parent) {
    return;
  }

  const parentDom = findParentDom(fiber);

  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    addDom(fiber, parentDom);
  }
  if (fiber.effectTag === 'DELETION' && fiber.dom != null) {
    removeDom(fiber, parentDom);
  }
  if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
    updateDom(fiber);
  }

  renderFiberNode(fiber.child);
  renderFiberNode(fiber.sibling);
}

function findParentDom(fiber) {
  let parentFiber = fiber.parent;
  while (!parentFiber.dom) {
    parentFiber = parentFiber.parent;
  }
  return parentFiber.dom;
}

function addDom(fiber, parentDom) {
  parentDom.appendChild(fiber.dom);
}

function updateDom(fiber) {
  let dom = fiber.dom;
  const prevProps = fiber.alternate ? fiber.alternate.props : {};
  const newProps = fiber.props;

  if (prevProps) {
    // Remove event listeners
    Object.keys(prevProps)
    .filter(isEvent)
    .filter(
        key => isGone(prevProps, newProps)(key) || isNew(prevProps, newProps)(
            key))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });

    // Remove old props
    Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, newProps))
    .forEach(name => {
      dom[name] = "";
    });
  }

  if (newProps) {
    // Add event listeners
    Object.keys(newProps)
    .filter(isEvent)
    .filter(isNew(prevProps, newProps))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, newProps[name]);
    });

    // Add new props
    Object.keys(newProps)
    .filter(isProperty)
    .filter(isNew(prevProps, newProps))
    .forEach(name => {
      dom[name] = newProps[name];
    });
  }
}

function removeDom(fiber, parentDom) {
  if (fiber.dom) {
    parentDom.removeChild(fiber.dom);
  } else {
    removeDom(fiber.child, parentDom);
  }
}

// HOOKS //

function useState(initial) {
  const oldHook = wipFiber.alternate
      && wipFiber.alternate.hooks
      && wipFiber.alternate.hooks[hookIndex];
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: []
  };

  const actions = oldHook ? oldHook.queue : [];
  actions.forEach(action => {
    hook.state = action(hook.state);
  });

  const setState = action => {
    hook.queue.push(action);
    wipRoot = {
      dom: currentRoot ? currentRoot.dom : null,
      props: currentRoot ? currentRoot.props : null,
      alternate: currentRoot
    }
    nextUnitOfWork = wipRoot;
    deletions = [];
  };

  wipFiber.hooks.push(hook);
  hookIndex++;
  return [hook.state, setState];
}

function useEffect(callback, updateDeps) {
  const oldHook = wipFiber.alternate
      && wipFiber.alternate.hooks
      && wipFiber.alternate.hooks[hookIndex];
  const hook = {
    useEffect: oldHook ? oldHook.useEffect : false,
  };
  if (!hook.useEffect) {
    callback();
    hook.useEffect = true;
  } else if (updateDeps) {
  }

  wipFiber.hooks.push(hook);
  hookIndex++;
}

// RENDER //

function render(element, container) {
  const ContextProvider = ({children, ...rest}) => {
    context = rest;
    return createElement(Fragment, {}, children);
  }

  const ContextConsumer = (props) => {
    const children = props.children;
    children.forEach(child => {
      child.props = {
        ...context,
        ...child.props,
      }
    })

    return createElement(Fragment, {}, children);
  }

  return {
    Provider: ContextProvider,
    Consumer: ContextConsumer
  }
}

/// Fragment ///
const Fragment = ({children}) => {
  return children;
}

export default {
  render,
  createElement,
  useState,
  useEffect,
  createContext,
  Fragment
}
