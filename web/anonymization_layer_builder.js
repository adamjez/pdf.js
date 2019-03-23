/* Copyright 2014 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { AnonymizationLayer } from 'pdfjs-lib';
import { NullL10n } from './ui_utils';

/**
 * @typedef {Object} AnnotationLayerBuilderOptions
 * @property {HTMLDivElement} pageDiv
 * @property {PDFPage} pdfPage
 * @property {boolean} renderInteractiveForms
 * @property {IL10n} l10n - Localization service.
 */

class AnonymizationLayerBuilder {
  /**
   * @param {AnnotationLayerBuilderOptions} options
   */
  constructor({ pageDiv, pdfPage, rectangles, l10n = NullL10n, }) {
    this.pageDiv = pageDiv;
    this.pdfPage = pdfPage;
    this.l10n = l10n;

    this.rectangles = rectangles;
    this.canvas = null;
    this._cancelled = false;
  }

  /**
   * @param {PageViewport} viewport
   * @param {string} intent (default value is 'display')
   */
  render(viewport, intent = 'display') {
    this.pdfPage.getAnnotations({ intent, }).then((annotations) => {
      if (this._cancelled) {
        return;
      }

      let parameters = {
        viewport: viewport.clone({ dontFlip: true, }),
        canvas: this.canvas,
        page: this.pdfPage,
        rectangles: this.rectangles
      };

      if (this.canvas) {
        this.updateCanvas(viewport);

        // If an anonymizationLayer already exists, refresh its children's
        // transformation matrices.
        AnonymizationLayer.update(parameters);
      } else {
        // Create an anonymization layer div and render the rectangles
        // if there is at least one rectangle.
        this.canvas = document.createElement('canvas');
        this.updateCanvas(viewport);

        this.pageDiv.appendChild(this.canvas);
        parameters.canvas = this.canvas;

        AnonymizationLayer.render(parameters);
        this.l10n.translate(this.canvas);
      }
    });
  }

  updateCanvas(viewport) {
    this.canvas.width = viewport.width;
    this.canvas.height = viewport.height;
    this.canvas.style.width  = this.pageDiv.style.width;
    this.canvas.style.height = this.pageDiv.style.height;
  }

  cancel() {
    this._cancelled = true;
  }

  hide() {
    if (!this.canvas) {
      return;
    }
    this.canvas.setAttribute('hidden', 'true');
  }
}

/**
 * @implements IPDFAnonymizationLayerFactory
 */
class DefaultAnonymizationLayerFactory {
  /**
   * @param {HTMLDivElement} pageDiv
   * @param {PDFPage} pdfPage
   * @param {IL10n} l10n
   * @returns {AnonymizationLayerBuilder}
   */
  createAnonymizationBuilder(pageDiv, pdfPage, rectangles, l10n = NullL10n) {
    return new AnonymizationLayerBuilder({
      pageDiv,
      pdfPage,
      rectangles,
      imageResourcesPath,
      l10n,
    });
  }
}

export {
  AnonymizationLayerBuilder,
  DefaultAnonymizationLayerFactory,
};
