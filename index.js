import Didact from './midact.js';
import Redac from './medac.js';

var root = document.createElement('div');
root["id"] = "root";
document.body.appendChild(root);
const AppContext = Didact.createContext();

/// Redac ////

const newChangeAction = (channel, delta) => {
  return {type: 'CHANGE', channel, delta};
};

const valueReducer = (channel) => (state = 0, action) => {
  if (action.type === 'CHANGE' && action.channel === channel) {
    return state + action.delta;
  }
  return state;
}

const rootReducers = Redac.combineReducer({
  "red": valueReducer("red"),
  "green": valueReducer("green"),
  "blue": valueReducer("blue"),
})
const redacStore = Redac.createStore(rootReducers);

const ValueChooser = (props) => {
  const {channel, change} = props;
  const val = props[channel] + "";
  const jump = 5;
  return (
      <div>
        <span>{channel}: {val}</span>
        <button onClick={() => change(channel, jump)}>+</button>
        <button onClick={() => change(channel, -jump)}>-</button>
      </div>
  )
};

const ValueChooserWrapper = Redac.connect(
    state => state,
    dispatch => ({
      change: (channel, delta) => dispatch(newChangeAction(channel, delta))
    })
)(ValueChooser);

const ColorDisplayer = ({red, green, blue}) => {
  let styles = `background-color: rgb(${red % 255}, ${green % 255}, ${blue % 255});`;
  styles += 'height: 50px;';
  styles += 'width: 50px';

  return (
      <div style={styles}>
      </div>
  )
}

const ColorDisplayerWrapper = Redac.connect(
    state => state,
    dispatch => ({})
)(ColorDisplayer);

/// App
Didact.render(
    <Redac.Provider store={redacStore}>
      <ValueChooserWrapper key="red" channel="red"/>
      <ValueChooserWrapper key="green" channel="green"/>
      <ValueChooserWrapper key="blue" channel="blue"/>
      <ColorDisplayerWrapper/>
    </Redac.Provider>
    , root);
