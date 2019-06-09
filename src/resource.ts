export abstract class Resource {
  constructor(public target: string) {
  }

  abstract execute(args: string[]): void
}
