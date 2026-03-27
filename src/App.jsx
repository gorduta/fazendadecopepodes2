// v1.3.0 - busca + categorias + footer + melhorias
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
import {
  ShoppingCart,
  Fish,
  Truck,
  MessageCircle,
  QrCode,
  CreditCard,
  Plus,
  Minus,
  X,
  Loader2,
  Pencil,
  Upload,
  Save,
  Search,
  Instagram,
} from "lucide-react";

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
  build: "v1.3.0",
};

function currency(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function normalizeCep(value) {
  return value.replace(/\D/g, "").slice(0, 8);
}

function formatCep(value) {
  const cep = normalizeCep(value);
  if (cep.length <= 5) return cep;
  return `${cep.slice(0, 5)}-${cep.slice(5)}`;
}

function calculateShipping(cep, subtotal) {
  const clean = normalizeCep(cep);
  if (clean.length < 8) return null;

  let shipping = 18.9;
  if (subtotal >= 180) shipping = 0;

  return { shipping, eta: "3 a 5 dias úteis" };
}

function ProductAdmin({ products, refreshProducts }) {
  const [logged, setLogged] = useState(false);
  const [password, setPassword] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    price: "",
    category: "",
    description: "",
    image: "",
  });

  const uploadImage = async (file) => {
    setUploading(true);
    const storageRef = ref(storage, `products/${Date.now()}-${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    setForm({ ...form, image: url });
    setUploading(false);
  };

  const save = async () => {
    const data = { ...form, price: Number(form.price) };
    if (editingId) {
      await updateDoc(doc(db, "products", editingId), data);
    } else {
      await addDoc(productsCollection, { ...data, createdAt: Date.now() });
    }
    setForm({ name: "", price: "", category: "", description: "", image: "" });
    setEditingId(null);
    refreshProducts();
  };

  if (!logged)
    return (
      <div>
        <input value={password} onChange={(e) => setPassword(e.target.value)} />
        <button onClick={() => password === STORE.adminPassword && setLogged(true)}>Entrar</button>
      </div>
    );

  return (
    <div>
      <input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input placeholder="Preço" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
      <input placeholder="Categoria" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />

      <input type="file" onChange={(e) => uploadImage(e.target.files[0])} />
      {uploading && <p>Enviando...</p>}

      <textarea placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

      <button onClick={save}>{editingId ? "Salvar" : "Adicionar"}</button>

      {products.map((p) => (
        <div key={p.id}>
          {p.name}
          <button onClick={() => { setEditingId(p.id); setForm(p); }}>Editar</button>
          <button onClick={async () => { await deleteDoc(doc(db, "products", p.id)); refreshProducts(); }}>Remover</button>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");

  const load = async () => {
    const q = query(productsCollection, orderBy("createdAt", "asc"));
    const snap = await getDocs(q);
    setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => { load(); }, []);

  const categories = ["Todos", ...new Set(products.map((p) => p.category || "Sem categoria"))];

  const filtered = products.filter((p) => {
    const matchSearch = `${p.name} ${p.description}`.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "Todos" || p.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div>
      <h1>{STORE.name}</h1>

      <input placeholder="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} />

      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        {categories.map((c) => <option key={c}>{c}</option>)}
      </select>

      {filtered.map((p) => (
        <div key={p.id}>
          <img src={p.image} width={100} />
          <h3>{p.name}</h3>
          <p>{p.category}</p>
        </div>
      ))}

      <ProductAdmin products={products} refreshProducts={load} />

      <footer>
        <p>{STORE.name}</p>
        <p>WhatsApp: {STORE.whatsappLabel}</p>
        <p>Instagram: {STORE.instagram}</p>
        <p>Build: {STORE.build}</p>
      </footer>
    </div>
  );
}
