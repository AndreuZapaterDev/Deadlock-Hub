export type Query = Record<string, string | number | boolean | undefined>;

export type ApiResult<T = unknown> = {
  /** Código HTTP guardado en el fixture (puede ser 4xx/5xx real). */
  status: number;
  contentType: string;
  data: T;
  /** Cómo se resolvió: útil para depurar el mock. */
  match?: "exact" | "same-path" | "template";
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Contrato único: páginas y componentes no saben si los datos vienen del mock o de la API. */
export interface DataSource {
  get<T = unknown>(path: string, query?: Query): Promise<ApiResult<T>>;
}
