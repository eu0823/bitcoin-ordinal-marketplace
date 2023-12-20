export const initialState = {walletAddress: ""};
export function walletReducer(state, action) {
  switch (action.type) {
    case 'SET_ADDRESS':
      return { walletAddress: action.data};
    default:
      return { walletAddress: ""};
  }
}
