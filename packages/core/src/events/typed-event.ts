export interface TypedEventInit<TDetail> extends CustomEventInit<TDetail> {
  readonly detail: TDetail;
}

export class TypedEvent<TDetail> extends CustomEvent<TDetail> {
  constructor(type: string, init: TypedEventInit<TDetail>) {
    super(type, { bubbles: true, composed: true, ...init });
  }
}
