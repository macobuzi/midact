import Didact from './midact.js';

const createStore = rootReducer => {
  let state;
  let listeners = [];

  const getState = () => state;
  const dispatch = action => {
    state = rootReducer(state, action);
    listeners.forEach(listener => listener(state));
  }
  const subscribe = listener => {
    listeners.push(listener);
  }

  dispatch({});

  return {getState, dispatch, subscribe};
}

const combineReducer = reducers => {
  const reducerFunctions = {};
  Object.keys(reducers).forEach(key => {
    if (typeof reducers[key] === 'function') {
      reducerFunctions[key] = reducers[key];
    }
  });

  return (state = {}, action) => {
    const nextState = {};
    Object.keys(reducerFunctions).forEach(key => {
      nextState[key] = reducerFunctions[key](state[key], action);
    })
    return nextState;
  }
}

const ReduxContext = Didact.createContext("redux");

const Provider = ({store, children}) => {
  return (
      <ReduxContext.Provider store={store}>{children}</ReduxContext.Provider>
  )
}

const connect = (mapStatesToProps, mapDispatchToProps) => Component => {
  return (props) => {
    const newProps = {
      ...props,
      component: Component,
      mapStatesToProps,
      mapDispatchToProps
    }

    return (
        <ReduxContext.Consumer>
          <ConnectWrapper {...newProps}/>
        </ReduxContext.Consumer>
    )
  }
}

const ConnectWrapper = (props) => {
  const {store} = props;
  const [reduxState, setReduxState] = Didact.useState(store.getState());

  Didact.useEffect(() => {
    store.subscribe(state => {
      setReduxState(() => state);
    });
  }, [])

  const {component, mapStatesToProps, mapDispatchToProps} = props;
  const Component = component;

  return (
      <Component
          {...props}
          {...mapStatesToProps(store.getState())}
          {...mapDispatchToProps(store.dispatch)}
      />
  )
}

export default {
  createStore,
  combineReducer,
  Provider,
  connect
}
