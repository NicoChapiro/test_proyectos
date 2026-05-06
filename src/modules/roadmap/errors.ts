export class RoadmapError extends Error {
  constructor(message: string, public readonly statusCode = 400) {
    super(message);
    this.name = "RoadmapError";
  }
}

export class RoadmapNotFoundError extends RoadmapError {
  constructor(message = "Proyecto de roadmap no encontrado") {
    super(message, 404);
    this.name = "RoadmapNotFoundError";
  }
}

export function toHttpError(error: unknown): { status: number; message: string } {
  if (error instanceof RoadmapError) {
    return { status: error.statusCode, message: error.message };
  }

  console.error(error);
  return { status: 500, message: "Error interno del servidor" };
}
