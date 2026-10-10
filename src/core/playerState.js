function initialState(config) {
  return { bossOn: false, liveOn: false, localMuted: config.muted !== false, liveMuted: config.liveMuted !== false };
}
function transition(state, action) {
  switch (action.type) {
    case 'toggle-boss': return { ...state, bossOn: !state.bossOn };
    case 'ended': return state.liveOn ? state : { ...state, bossOn: true };
    case 'live': return { ...state, liveOn: Boolean(action.value) };
    case 'local-sound': return { ...state, localMuted: !action.value };
    case 'live-sound': return { ...state, liveMuted: !action.value };
    default: throw new Error('Unknown player action');
  }
}
function viewState(state) {
  return { ...state, source: state.liveOn ? 'live' : 'local',
    effectiveLocalMuted: state.localMuted || state.bossOn || state.liveOn,
    effectiveLiveMuted: state.liveMuted || state.bossOn || !state.liveOn,
    liveVisible: state.liveOn && !state.bossOn };
}
module.exports = { initialState, transition, viewState };
