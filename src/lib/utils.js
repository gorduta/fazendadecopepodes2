import { STORE } from "./firebase";

export function currency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function normalizeCep(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 8);
}

export function formatCep(value) {
  const cep = normalizeCep(value);
  if (cep.length <= 5) return cep;
  return `${cep.slice(0, 5)}-${cep.slice(5)}`;
}

export function calculateShipping(cep, subtotal) {
  const clean = normalizeCep(cep);
  if (clean.length < 8) return null;

  const firstDigit = Number(clean[0]);
  let shipping = 18.9;
  let eta = "3 a 5 dias úteis";

  if (firstDigit <= 1) {
    shipping = 14.9;
    eta = "1 a 3 dias úteis";
  } else if (firstDigit <= 3) {
    shipping = 19.9;
    eta = "2 a 4 dias úteis";
  } else if (firstDigit <= 6) {
    shipping = 26.9;
    eta = "3 a 6 dias úteis";
  } else {
    shipping = 33.9;
    eta = "4 a 8 dias úteis";
  }

  if (subtotal >= 180) shipping = 0;

  return {
    shipping,
    eta,
    service: shipping === 0 ? "Frete grátis" : "Envio estimado",
  };
}

export function buildWhatsAppMessage(items, subtotal, shippingInfo, cep) {
  const lines = items.map(
    (item) => `- ${item.quantity}x ${item.name} (${currency(item.price)} cada)`
  );

  return encodeURIComponent(
    `Olá! Quero fazer um pedido na ${STORE.name}.\n\nItens:\n${lines.join("\n")}\n\nSubtotal: ${currency(
      subtotal
    )}\nFrete: ${shippingInfo ? currency(shippingInfo.shipping) : "a calcular"}\nCEP de entrega: ${
      cep || "não informado"
    }\nTotal: ${currency(subtotal + (shippingInfo?.shipping || 0))}`
  );
}
