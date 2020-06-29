const invalid = (name, text) => new Error(`Invalid ${name}: ${text}`);
// TODO: show notification
export default class Errors {
  BlockError(text) {
    invalid('block', text)
  }
  
  TransactionError(text) {
    invalid('transaction', text)
  }
  
  MinerWarning(text) {
    new Error(`warning @Miner: ${text}`)
  }
}
