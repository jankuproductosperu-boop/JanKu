import { describe, expect, it } from "vitest";
import { diasHabilesRestantes, sumarDiasHabiles } from "@/lib/diasHabiles";

// Mediodía en Lima (UTC−5) = 17:00 UTC.
const lima = (iso: string, hora = "12:00") => new Date(`${iso}T${hora}:00-05:00`);
/** Día de Lima (AAAA-MM-DD) de una fecha. */
const diaDe = (d: Date) => new Date(d.getTime() - 5 * 3_600_000).toISOString().slice(0, 10);

describe("sumarDiasHabiles", () => {
  it("viernes + 1 día hábil = lunes", () => {
    expect(diaDe(sumarDiasHabiles(lima("2026-11-20"), 1))).toBe("2026-11-23");
  });
  it("lunes + 1 = martes", () => {
    expect(diaDe(sumarDiasHabiles(lima("2026-11-16"), 1))).toBe("2026-11-17");
  });
  it("sábado y domingo empiezan a contar el lunes", () => {
    expect(diaDe(sumarDiasHabiles(lima("2026-11-21"), 1))).toBe("2026-11-23");
    expect(diaDe(sumarDiasHabiles(lima("2026-11-22"), 1))).toBe("2026-11-23");
  });
  it("15 días hábiles = 3 semanas exactas desde un lunes", () => {
    expect(diaDe(sumarDiasHabiles(lima("2026-11-16"), 15))).toBe("2026-12-07");
  });
  it("cambio de mes", () => {
    // jueves 26-11 + 5 hábiles: vie 27, lun 30, mar 1, mié 2, jue 3
    expect(diaDe(sumarDiasHabiles(lima("2026-11-26"), 5))).toBe("2026-12-03");
  });
  it("cambio de año", () => {
    // jueves 24-12-2026 + 15 hábiles: termina el jueves 14-01-2027
    expect(diaDe(sumarDiasHabiles(lima("2026-12-24"), 15))).toBe("2027-01-14");
  });
  it("usa el día de Lima, no el de UTC", () => {
    // Viernes 20-11 a las 21:00 en Lima ya es sábado en UTC.
    expect(diaDe(sumarDiasHabiles(lima("2026-11-20", "21:00"), 1))).toBe("2026-11-23");
  });
  it("devuelve el final del día en Lima", () => {
    expect(sumarDiasHabiles(lima("2026-11-20"), 1).toISOString()).toBe("2026-11-24T04:59:59.999Z");
  });
  it("0 días = final de hoy", () => {
    expect(diaDe(sumarDiasHabiles(lima("2026-11-21"), 0))).toBe("2026-11-21");
  });
  it("rechaza n negativo o decimal", () => {
    expect(() => sumarDiasHabiles(lima("2026-11-20"), -1)).toThrow();
    expect(() => sumarDiasHabiles(lima("2026-11-20"), 1.5)).toThrow();
  });
});

describe("diasHabilesRestantes", () => {
  const limite = sumarDiasHabiles(lima("2026-11-16"), 15); // lunes 07-12-2026, fin del día
  it("al crear quedan 15", () => expect(diasHabilesRestantes(limite, lima("2026-11-16"))).toBe(15));
  it("el fin de semana no descuenta", () => {
    expect(diasHabilesRestantes(limite, lima("2026-11-21"))).toBe(diasHabilesRestantes(limite, lima("2026-11-22")));
  });
  it("el día límite queda 0", () => expect(diasHabilesRestantes(limite, lima("2026-12-07", "23:00"))).toBe(0));
  it("pasado el límite es negativo", () => {
    expect(diasHabilesRestantes(limite, lima("2026-12-08"))).toBe(-1);
    expect(diasHabilesRestantes(limite, lima("2026-12-10"))).toBe(-3);
  });
  it("vencido en fin de semana cuenta al menos −1", () => {
    const viernes = sumarDiasHabiles(lima("2026-11-19"), 1); // vie 20-11
    expect(diasHabilesRestantes(viernes, lima("2026-11-21"))).toBe(-1);
  });
});
