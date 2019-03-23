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

import {
  DOMSVGFactory
} from './dom_utils';
import {
  AnnotationBorderStyleType, unreachable, Util, warn
} from '../shared/util';

/**
 * @typedef {Object} AnnotationElementParameters
 * @property {Object} data
 * @property {HTMLDivElement} layer
 * @property {PDFPage} page
 * @property {PageViewport} viewport
 * @property {IPDFLinkService} linkService
 * @property {DownloadManager} downloadManager
 * @property {string} imageResourcesPath - (optional) Path for image resources,
 *   mainly for annotation icons. Include trailing slash.
 * @property {boolean} renderInteractiveForms
 * @property {Object} svgFactory
 */

class AnonymizationElementFactory {
  /**
   * @param {AnnotationElementParameters} parameters
   * @returns {AnnotationElement}
   */
  static create(parameters) {
    const { canvas, rectangle, viewport } = parameters;
    const ctx = canvas.getContext('2d');
    const viewPortX = viewport.convertToViewportPoint(rectangle.x0, rectangle.y0);
    const viewPortY = viewport.convertToViewportPoint(rectangle.x1, rectangle.y1);

    const viewportRectangle = [
      viewPortX[0],
      Math.abs(viewPortX[1] - viewport.height),
      viewPortY[0] - viewPortX[0],
      Math.abs(viewPortY[1] - viewport.height) - Math.abs(viewPortX[1] - viewport.height)
    ];

    return {
      isRenderable: true,
      render: function () {
        ctx.fillStyle = 'black';
        ctx.fillRect(...viewportRectangle);
      },
      clear: function () {
        ctx.clearRect(...viewportRectangle);
      }
    };
  }
}

/**
 * @typedef {Object} AnnotationLayerParameters
 * @property {PageViewport} viewport
 * @property {HTMLDivElement} canvas
 * @property {Array} annotations
 * @property {PDFPage} page
 * @property {IPDFLinkService} linkService
 * @property {DownloadManager} downloadManager
 * @property {string} imageResourcesPath - (optional) Path for image resources,
 *   mainly for annotation icons. Include trailing slash.
 * @property {boolean} renderInteractiveForms
 */

class AnonymizationLayer {
  /**
   * Render a new annotation layer with all annotation elements.
   *
   * @public
   * @param {AnnotationLayerParameters} parameters
   * @memberof AnonymizationLayer
   */
  static render(parameters) {
    const { canvas, rectangles, viewport } = parameters;

    const rectangleFactory = function (rectangle) {
      return AnonymizationElementFactory.create({
        rectangle: rectangle,
        canvas: canvas,
        page: parameters.page,
        viewport: viewport
      })
    };

    AnonymizationLayer.renderRectangles(parameters, rectangleFactory);
    AnonymizationLayer.registerCanvasEvents(canvas, viewport, rectangles, function () {
      AnonymizationLayer.renderRectangles(parameters, rectangleFactory);
    }, rectangleFactory);
  }

  static renderRectangles(parameters, rectangleFactory) {
    const rectangles = parameters.rectangles;

    for (let i = 0, ii = rectangles.length; i < ii; i++) {
      let rectangle = rectangles[i];
      if (!rectangle) {
        continue;
      }
      let element = rectangleFactory(rectangle);
      if (element.isRenderable) {
        element.render();
      }
    }
  }

  static registerCanvasEvents(canvas, viewport, rectangles, rerender, rectangleFactory) {
    var painting = false;
    var createRectangle = null;
    var rectangle = null;

    canvas.addEventListener('mousedown', function (e) {
      if (!painting) {
        createRectangle = function (mouseEvent) {
          const point0 = viewport.convertToPdfPoint(e.offsetX, viewport.height - e.offsetY);
          const point1 = viewport.convertToPdfPoint(mouseEvent.offsetX, viewport.height - mouseEvent.offsetY);

          return { x0: point0[0], y0: point0[1], x1: point1[0], y1: point1[1] };
        }
        painting = true;
      }
    });

    canvas.addEventListener('mouseup', function (e) {
      if (painting) {
        let rectangle = createRectangle(e);
        rectangles.push(rectangle);

        rerender();

        painting = false;
      }
    });

    canvas.addEventListener('mousemove', function (e) {
      if (rectangle) {
        rectangle.clear();
        rectangle = null;
        rerender();
      }

      if (painting) {
        rectangle = rectangleFactory(createRectangle(e));
        rectangle.render();
      }
    });
  }

  /**
   * Update the annotation elements on existing annotation layer.
   *
   * @public
   * @param {AnnotationLayerParameters} parameters
   * @memberof AnnotationLayer
   */
  static update(parameters) {
    AnonymizationLayer.renderRectangles(parameters);

    parameters.canvas.removeAttribute('hidden');
  }
}

export {
  AnonymizationLayer,
};
