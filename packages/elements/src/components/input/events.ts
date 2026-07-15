import { TypedEvent } from "@tokotuku/core";

export interface TkChangeEventDetail {
  value: string;
}

export class TkChangeEvent extends TypedEvent<TkChangeEventDetail> {
  constructor(detail: TkChangeEventDetail) {
    super("tk-change", { detail });
  }
}
