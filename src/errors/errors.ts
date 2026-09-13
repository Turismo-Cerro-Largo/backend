export class AppError extends Error {
    constructor(message: string, public status: number = 400) {
        super(message);
    }
}

export class NotFoundError extends AppError {
    constructor(message = "No encontrado") {
        super(message, 404);
    }
}

export class ValidationError extends AppError {
    constructor(message = "Datos inválidos") {
        super(message, 400);
    }
}

export class ConflictError extends AppError {
    constructor(message = "El recurso ya existe") {
        super(message, 409);
    }
}