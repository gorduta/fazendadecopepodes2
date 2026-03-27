import { useEffect, useMemo, useState } from "react";
import { initializeApp } from "firebase/app";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

// ❌ REMOVIDO lucide-react (causando erro de CDN)
// Vamos usar ícones simples (emoji) para evitar falha de build

const firebaseConfig = {
  apiKey: "AIzaSyARrqIeDcMwcFx-_LtJmr3m98tTUjVVj8Y",
  authDomain: "fazendadecopepodes.firebaseapp.com",
  projectId: "fazendadecopepodes",
  storageBucket: "fazendadecopepodes.firebasestorage.app",
  messagingSenderId: "705544965480",
  appId: "1:705544965480:web:6e6019ecf4ec166ef2dadd",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const productsCollection = collection(db, "products");

const STORE = {
  name: "Fazenda de Copepodes",
  whatsapp: "5514998710044",
  whatsappLabel: "(14) 99871-0044",
  originCep: "14051-260",
  instagram: "@fazendadecopepodes",
  instagramUrl: "https://instagram.com/fazendadecopepodes",
  email: "contato@fazendadecopepodes.com.br",
  pixKey: "64.963.562/0001-13",
  mercadoPagoLink: "https://link.mercadopago.com.br/fazendadecopepodes",
  adminPassword: "1234",
  build: "v1.5.0",
};

function currency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function App() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    async function load() {
      const snapshot = await getDocs(productsCollection);
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#f4efe6] text-[#2a241f]">

      <header className="bg-[#244634] text-white p-4 flex justify-between">
        <h1 className="text-xl font-bold">🌱 Fazenda de Copepodes</h1>
        <span>🛒</span>
      </header>

      <main className="p-6 grid gap-4 md:grid-cols-3">
        {products.map((p) => (
          <div key={p.id} className="bg-white rounded-xl p-4 shadow">
            <img src={p.image} className="w-full h-40 object-cover rounded" />
            <h2 className="font-bold mt-2">{p.name}</h2>
            <p className="text-sm">{p.description}</p>
            <p className="font-bold mt-2">{currency(p.price)}</p>
          </div>
        ))}
      </main>

      <footer className="bg-[#244634] text-white p-4 text-center">
        Build: {STORE.build}
      </footer>
    </div>
  );
}
