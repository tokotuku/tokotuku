import { html, LitElement, unsafeCSS } from "lit";
import { tagName } from "../../constants.js";
import styles from "./component.css?raw";

export class TkCard extends LitElement {
  static override styles = unsafeCSS(styles);

  protected override render() {
    return html`
      <slot name="media"></slot>
      <div class="body" part="body">
        <slot></slot>
      </div>
      <div class="footer" part="footer">
        <slot name="footer"></slot>
      </div>
    `;
  }
}

customElements.define(tagName("card"), TkCard);

declare global {
  interface HTMLElementTagNameMap {
    "tk-card": TkCard;
  }
}
