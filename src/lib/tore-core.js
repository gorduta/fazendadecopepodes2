import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { collection, doc, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyARrqIeDcMwcFx-_LtJmr3m98tTUjVVj8Y",
  authDomain: "fazendadecopepodes.firebaseapp.com",
  projectId: "fazendadecopepodes",
  storageBucket: "fazendadecopepodes.firebasestorage.app",
  messagingSenderId: "705544965480",
  appId: "1:705544965480:web:6e6019ecf4ec166ef2dadd",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export const productsCollection = collection(db, "products");
export const contentDoc = doc(db, "siteContent", "main");

export const STORE = {
  name: "Fazenda de Copepodes",
  whatsapp: "5514998710044",
  whatsappLabel: "(14) 99871-0044",
  originCep: "14051-260",
  instagram: "@fazendadecopepodes",
  instagramUrl: "https://instagram.com/fazendadecopepodes",
  email: "contato@fazendadecopepodes.com.br",
  pixKey: "64.963.562/0001-13",
  mercadoPagoLink: "https://link.mercadopago.com.br/fazendadecopepodes",
  build: "v1.8.0",
};

export const initialProducts = [
  {
    name: "Copepodes Starter",
    price: 39.9,
    badge: "Mais vendido",
    size: "100 ml",
    category: "Starter",
    description:
      "Cultura inicial para fortalecer o ecossistema do aquário marinho com alimento vivo de qualidade.",
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
    createdAt: Date.now(),
  },
  {
    name: "Cultura Premium",
    price: 69.9,
    badge: "Alta densidade",
    size: "250 ml",
    category: "Premium",
    description:
      "Maior concentração de copepodes para nutrição eficiente de peixes, corais e outros organismos.",
    image:
      "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&w=1200&q=80",
    createdAt: Date.now() + 1,
  },
  {
    name: "Kit Fazenda Completa",
    price: 119.9,
    badge: "Kit completo",
    size: "Combo",
    category: "Kit",
    description:
      "Solução completa para quem quer iniciar e manter uma fazenda própria com mais estabilidade.",
    image:
      "https://images.unsplash.com/photo-1520302630591-fd1c66ed7a41?auto=format&fit=crop&w=1200&q=80",
    createdAt: Date.now() + 2,
  },
];

export const defaultContent = {
  hero: {
    title: "Alimento vivo de confiança para seu aquário marinho",
    subtitle: "Cultivo natural e envio rápido",
    text: "Uma loja com identidade própria, foco total em copepodes, praticidade no pedido e checkout rápido por WhatsApp, Pix e Mercado Pago.",
    image:
      "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&w=1400&q=80",
    button1: "Comprar agora",
    button2: "Falar no WhatsApp",
  },
  features: [
    {
      emoji: "🐠",
      title: "Foco em aquarismo",
      text: "Comunicação e oferta pensadas para quem realmente cuida de aquário marinho.",
    },
    {
      emoji: "🚚",
      title: "Pedido rápido",
      text: "Carrinho simples, cálculo de frete no checkout e finalização imediata por WhatsApp.",
    },
    {
      emoji: "📦",
      title: "Catálogo organizado",
      text: "Busca, categoria e painel simples para manter a loja sempre atualizada.",
    },
  ],
  contact: {
    whatsappLabel: "(14) 99871-0044",
    instagram: "@fazendadecopepodes",
    email: "contato@fazendadecopepodes.com.br",
  },
  footer: {
    note: "Painel protegido com Firebase Authentication.",
  },
};

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
