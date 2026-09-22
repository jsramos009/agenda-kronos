import assert from "node:assert/strict";
import test from "node:test";
import { parseCustomerInput } from "./customer-input.ts";

test("aceita cliente somente com nome", () => {
  const result = parseCustomerInput({ name: "Pedro Fonseca", phone: "", email: "", consent: false });
  assert.equal(result.success, true);
});

test("aceita cliente com telefone ou e-mail", () => {
  assert.equal(parseCustomerInput({ name: "Ana Lima", phone: "11999999999", email: "", consent: true }).success, true);
  assert.equal(parseCustomerInput({ name: "Ana Lima", phone: "", email: "ana@example.com", consent: true }).success, true);
});

test("rejeita nome curto e contato inválido", () => {
  assert.equal(parseCustomerInput({ name: "A", phone: "", email: "", consent: false }).success, false);
  assert.equal(parseCustomerInput({ name: "Ana Lima", phone: "123", email: "", consent: false }).success, false);
  assert.equal(parseCustomerInput({ name: "Ana Lima", phone: "", email: "email-invalido", consent: false }).success, false);
});

