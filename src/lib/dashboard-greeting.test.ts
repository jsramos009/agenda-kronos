import assert from "node:assert/strict";
import test from "node:test";
import { dashboardGreeting } from "./dashboard-greeting.ts";

test("personaliza manhã com o primeiro nome", () => {
  const result = dashboardGreeting(9, "Juliana Souza", 3);
  assert.equal(result.headline, "Bom dia, Juliana.");
  assert.match(result.welcome, /faturar bastante/);
});

test("muda a saudação ao longo do dia", () => {
  assert.equal(dashboardGreeting(15, "Juliana", 1).salutation, "Boa tarde");
  assert.equal(dashboardGreeting(21, "Juliana", 0).salutation, "Boa noite");
});

test("acolhimento e próximos horários consideram contexto", () => {
  assert.match(dashboardGreeting(11, "Juliana", 2).welcome, /hora do almoço/);
  assert.match(dashboardGreeting(15, "Juliana", 0).scheduleMessage, /Nenhum horário/);
});
