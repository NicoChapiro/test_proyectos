export class PackagingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PackagingError";
  }
}

export class PackagingNotFoundError extends PackagingError {
  constructor() {
    super("Solicitud de packaging no encontrada");
    this.name = "PackagingNotFoundError";
  }
}
