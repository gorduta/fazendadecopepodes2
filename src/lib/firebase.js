import { initializeApp } from "firebase/app";
import { getFirestore, collection } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyARrqIeDcMwcFx-_LtJmr3m98tTUjVVj8Y",
  authDomain: "fazendadecopepodes.firebaseapp.com",
  projectId: "fazendadecopepodes",
  storageBucket: "fazendadecopepodes.firebasestorage.app",
  messagingSenderId: "705544965480",
  appId: "1:705544965480:web:6e6019ecf4ec166ef2dadd",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const productsCollection = collection(db, "products");

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
  build: "v1.7.1",
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
