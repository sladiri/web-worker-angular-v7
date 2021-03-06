import { Component, OnInit } from "@angular/core";
import { View, Spec } from "vega";
import { WorkerService } from "./services/worker/worker.service";
import { DraggableArea } from "../draggable-area";

import { IIteratorStateManagement } from "@local/IteratorStateManagement/IIteratorStateManagement";
import {
  IEventsIterator,
  AsyncIterator,
} from "@local/IteratorStateManagement/EventsIterator";

declare var vega: any;
declare var vegaEmbed: (containerId: string, spec: any) => void;

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements OnInit, IIteratorStateManagement {
  readonly eventsProcessor: IEventsIterator = new AsyncIterator();
  title = "web-worker-v7";

  view: View;
  viewLite: View;

  iteratorTestField = "foo";

  constructor(private workerService: WorkerService) {
    document.addEventListener(
      "pointerdown",
      this.eventsProcessor.send.bind(this.eventsProcessor),
      false,
    );
    const self = this; // no arrow functions for async generators
    this.eventsProcessor.start([
      // this.dummyTransducer,
      async function*(source) {
        for await (const item of source) {
          self.updateState(item);
          yield;
        }
      },
    ]);
  }

  updateState(item) {
    console.log("item", item);
    this.iteratorTestField = this.iteratorTestField === "foo" ? "bar" : "foo";
  }

  async ngOnInit() {
    this.draggableTest();

    this.vegaInit();
    this.vegaLiteInit();

    this.testWorker(Object.create(null), "main");
    this.testWorker(Object.create(null), "another");
  }

  private draggableTest() {
    const area = DraggableArea();
    document.addEventListener("pointermove", area.send, false);
    document.addEventListener("pointerdown", area.send, false);
    document.addEventListener("pointerup", area.send, false);
    area.start();
  }

  private async vegaInit() {
    const spec: Spec = JSON.parse(
      await vega
        .loader()
        .load("https://vega.github.io/vega/examples/bar-chart.vg.json"),
    );
    this.view = new vega.View(vega.parse(spec))
      // .renderer("svg")
      .initialize("#vegaTest") // initialize view within parent DOM container
      // .width(300)
      // .height(300)
      .hover() // enable hover encode set processing
      .run();
  }

  private vegaLiteInit() {
    const spec = {
      $schema: "https://vega.github.io/schema/vega-lite/v3.0.0-rc6.json",
      description: "A simple bar chart with embedded data.",
      data: {
        values: [
          { a: "A", b: 28 },
          { a: "B", b: 55 },
          { a: "C", b: 43 },
          { a: "D", b: 91 },
          { a: "E", b: 81 },
          { a: "F", b: 53 },
          { a: "G", b: 19 },
          { a: "H", b: 87 },
          { a: "I", b: 52 },
        ],
      },
      mark: "bar",
      encoding: {
        x: { field: "a", type: "ordinal" },
        y: { field: "b", type: "quantitative" },
      },
    };
    vegaEmbed("#vegaLiteTest", spec);
  }

  private async testWorker(reference: any, workerName: string) {
    const { input, output } = this.workerService.workerInit(
      reference,
      workerName,
    );
    output.subscribe((event: MessageEvent) => {
      console.log("Got output:", JSON.stringify(event.data));
    });
    for await (const x of this.foo()) {
      input(x);
    }
    this.workerService.terminate(reference);
  }

  // TS does not parse async generators as class method correctly
  private readonly foo = async function*() {
    let i = 0;
    do {
      await new Promise((resolve, reject) => setTimeout(resolve, 1000));
      yield i;
      i += 1;
    } while (i < 3);
  };
}
