
export interface IdGenerator {
  next(): string;
  newId(): string;
}
