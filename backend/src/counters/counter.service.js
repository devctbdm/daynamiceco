import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { DATABASE } from "../db/database.js";
import { incrementCounter } from "./counter.repository.js";

class CounterService {
  constructor(database) {
    this.database = database;
  }

  async next(key) {
    if (typeof key !== "string" || !key.trim()) {
      throw new BadRequestException("Counter key is required");
    }

    return incrementCounter(this.database, key);
  }
}

Injectable()(CounterService);
Inject(DATABASE)(CounterService, undefined, 0);

export { CounterService };
