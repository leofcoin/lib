const invalid = (name, text) => new Error(`Invalid ${name}: ${text}`);
// TODO: show notification
/**
 * @example
 * const errors = new Errors()
 */
export default class Errors {
  BlockError(text) {
    return invalid('block', text)
  }
  
  TransactionError(text) {
    return invalid('transaction', text)
  }
  
  MinerWarning(text) {
    new Error(`warning @Miner: ${text}`)
  }
}
