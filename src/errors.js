const invalid = (name, text) => new Error(`Invalid ${name}: ${text}`);
// TODO: show notification
/**
 * @example
 * const errors = new Errors()
 */
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
