import { useEffect, useMemo, useState } from "react";
import { initializeApp } from "firebase/app";
import { addDoc, collection, deleteDoc, doc, getDocs, getFirestore, orderBy, query } from "firebase/firestore";
import { ShoppingCart, Fish, Truck, MessageCircle, QrCode, CreditCard, Plus, Minus, X, Loader2 } from "lucide-react";

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
const productsCollection = collection(db, "products");

const STORE = {
  name: "Fazenda de Copepodes",
  whatsapp: "5514998710044",
  whatsappLabel: "(14) 99871-0044",
  originCep: "14051-260",
  instagram: "@fazendadecopepodes",
  email: "contato@fazendadecopepodes.com.br",
  pixKey: "64.963.562/0001-13",
  mercadoPagoLink: "https://link.mercadopago.com.br/fazendadecopepodes",
  adminPassword: "1234",
};

const initialProducts = [
  { name: "Copepodes Starter", price: 39.9, badge: "Mais vendido", size: "100 ml", description: "Cultura inicial para fortalecer o ecossistema do aquário marinho com alimento vivo de qualidade.", image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80", createdAt: Date.now() },
  { name: "Cultura Premium", price: 69.9, badge: "Alta densidade", size: "250 ml", description: "Maior concentração de copepodes para nutrição eficiente de peixes, corais e outros organismos.", image: "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&w=1200&q=80", createdAt: Date.now() + 1 },
  { name: "Kit Fazenda Completa", price: 119.9, badge: "Kit completo", size: "Combo", description: "Solução completa para quem quer iniciar e manter uma fazenda própria com mais estabilidade.", image: "https://images.unsplash.com/photo-1520302630591-fd1c66ed7a41?auto=format&fit=crop&w=1200&q=80", createdAt: Date.now() + 2 },
];

function currency(value) { return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function normalizeCep(value) { return value.replace(/\D/g, "").slice(0, 8); }
function formatCep(value) { const cep = normalizeCep(value); return cep.length <= 5 ? cep : `${cep.slice(0,5)}-${cep.slice(5)}`; }
function calculateShipping(cep, subtotal) {
  const clean = normalizeCep(cep); if (clean.length < 8) return null;
  const firstDigit = Number(clean[0]); let shipping = 18.9; let eta = "3 a 5 dias úteis";
  if (firstDigit <= 1) { shipping = 14.9; eta = "1 a 3 dias úteis"; }
  else if (firstDigit <= 3) { shipping = 19.9; eta = "2 a 4 dias úteis"; }
  else if (firstDigit <= 6) { shipping = 26.9; eta = "3 a 6 dias úteis"; }
  else { shipping = 33.9; eta = "4 a 8 dias úteis"; }
  if (subtotal >= 180) shipping = 0;
  return { shipping, eta, service: shipping === 0 ? "Frete grátis" : "Envio estimado", origin: STORE.originCep };
}
function buildWhatsAppMessage(items, total, shippingInfo, cep) {
  const lines = items.map((item) => `- ${item.quantity}x ${item.name} (${currency(item.price)} cada)`);
  return encodeURIComponent(`Olá! Quero fazer um pedido na ${STORE.name}.\n\nItens:\n${lines.join("\n")}\n\nSubtotal: ${currency(total)}\nFrete: ${shippingInfo ? currency(shippingInfo.shipping) : "a calcular"}\nCEP de entrega: ${cep || "não informado"}\nTotal: ${currency(total + (shippingInfo?.shipping || 0))}`);
}

function ProductAdmin({ products, refreshProducts, isLoading }) {
  const [logged, setLogged] = useState(false);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", badge: "Novo", size: "", description: "", image: "" });

  const addProduct = async () => {
    if (!form.name || !form.price || !form.description || !form.image) return alert("Preencha nome, preço, descrição e imagem.");
    try {
      setSaving(true);
      await addDoc(productsCollection, { name: form.name, price: Number(form.price), badge: form.badge || "Novo", size: form.size || "Unidade", description: form.description, image: form.image, createdAt: Date.now() });
      setForm({ name: "", price: "", badge: "Novo", size: "", description: "", image: "" });
      await refreshProducts();
    } catch (error) { alert("Não foi possível salvar o produto."); console.error(error); }
    finally { setSaving(false); }
  };

  const removeProduct = async (id) => {
    try { await deleteDoc(doc(db, "products", id)); await refreshProducts(); }
    catch (error) { alert("Não foi possível remover o produto."); console.error(error); }
  };

  const restoreDefaults = async () => {
    try {
      setSaving(true);
      const snapshot = await getDocs(productsCollection);
      await Promise.all(snapshot.docs.map((item) => deleteDoc(doc(db, "products", item.id))));
      await Promise.all(initialProducts.map((product) => addDoc(productsCollection, product)));
      await refreshProducts();
    } catch (error) { alert("Não foi possível restaurar os produtos padrão."); console.error(error); }
    finally { setSaving(false); }
  };

  if (!logged) return (
    <div className="rounded-[2rem] border border-[#dbc8ac] bg-white p-8 shadow-lg">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8b5e3c]">Painel</p>
      <h3 className="mt-2 text-3xl font-black text-[#244634]">Área administrativa</h3>
      <p className="mt-4 text-sm leading-7 text-[#5c5147]">Agora os produtos são salvos na nuvem pelo Firebase.</p>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Digite a senha do painel" className="mt-5 w-full rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none focus:border-[#8b5e3c]" />
      <button onClick={() => password === STORE.adminPassword ? setLogged(true) : alert("Senha incorreta")} className="mt-4 rounded-2xl bg-[#244634] px-5 py-4 text-sm font-bold text-white">Entrar no painel</button>
    </div>
  );

  return (
    <div className="rounded-[2rem] border border-[#dbc8ac] bg-white p-8 shadow-lg">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8b5e3c]">Painel</p><h3 className="mt-2 text-3xl font-black text-[#244634]">Gerenciar produtos</h3></div>
        <button onClick={restoreDefaults} disabled={saving} className="rounded-2xl border border-[#244634] px-4 py-3 text-sm font-bold text-[#244634] disabled:opacity-50">Restaurar padrão</button>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <input className="rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none" placeholder="Nome do produto" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none" placeholder="Preço" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <input className="rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none" placeholder="Selo (ex: Novo)" value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} />
        <input className="rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none" placeholder="Tamanho / volume" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
        <input className="rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none md:col-span-2" placeholder="URL da imagem" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
        <textarea className="min-h-[120px] rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none md:col-span-2" placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <button onClick={addProduct} disabled={saving} className="mt-5 rounded-2xl bg-[#8b5e3c] px-5 py-4 text-sm font-bold text-white disabled:opacity-50">{saving ? "Salvando..." : "Adicionar produto"}</button>
      <div className="mt-8 space-y-4">
        {isLoading ? <div className="flex items-center gap-2 text-sm text-[#5c5147]"><Loader2 className="h-4 w-4 animate-spin" /> Carregando produtos...</div> :
          products.map((product) => (
            <div key={product.id} className="flex flex-col gap-4 rounded-2xl border border-[#decdb1] bg-[#fcfaf5] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <img src={product.image} alt={product.name} className="h-20 w-20 rounded-2xl object-cover" />
                <div><h4 className="font-black text-[#244634]">{product.name}</h4><p className="text-sm text-[#5c5147]">{currency(product.price)}</p></div>
              </div>
              <button onClick={() => removeProduct(product.id)} className="rounded-2xl border border-red-300 px-4 py-3 text-sm font-bold text-red-600">Remover</button>
            </div>
          ))
        }
      </div>
    </div>
  );
}

export default function App() {
  const [cart, setCart] = useState([]);
  const [cep, setCep] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [showPix, setShowPix] = useState(false);
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const refreshProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const q = query(productsCollection, orderBy("createdAt", "asc"));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      if (items.length === 0) {
        await Promise.all(initialProducts.map((product) => addDoc(productsCollection, product)));
        const seededSnapshot = await getDocs(q);
        setProducts(seededSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      } else setProducts(items);
    } catch (error) { console.error(error); alert("Não foi possível carregar os produtos do Firebase."); }
    finally { setIsLoadingProducts(false); }
  };

  useEffect(() => { refreshProducts(); }, []);

  const addToCart = (product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { ...product, quantity: 1 }];
    });
    setShowCart(true);
  };

  const updateQuantity = (id, amount) => {
    setCart((current) => current.map((item) => item.id === id ? { ...item, quantity: item.quantity + amount } : item).filter((item) => item.quantity > 0));
  };

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const itemsCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const shippingInfo = useMemo(() => calculateShipping(cep, subtotal), [cep, subtotal]);
  const total = subtotal + (shippingInfo?.shipping || 0);
  const whatsappUrl = `https://wa.me/${STORE.whatsapp}?text=${buildWhatsAppMessage(cart, subtotal, shippingInfo, formatCep(cep))}`;

  return <div className="min-h-screen bg-[#f4efe6] text-[#2a241f]"><header className="sticky top-0 z-40 border-b border-[#cdb693] bg-[#244634]/95 text-white backdrop-blur">
  <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">

    <div className="flex items-center gap-3">
      <img
        src="/logo.png"
        alt="Logo Fazenda de Copepodes"
        className="h-12 w-12 object-contain rounded-full bg-white"
      />
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#d7c08d]">
          Aquário marinho
        </p>
        <h1 className="text-2xl font-black md:text-3xl">
          Fazenda de Copepodes
        </h1>
      </div>
    </div>

    <nav className="hidden items-center gap-6 text-sm font-semibold md:flex">
      <a href="#produtos">Produtos</a>
      <a href="#beneficios">Benefícios</a>
      <a href="#frete">Frete</a>
      <a href="#painel">Painel</a>
      <a href="#contato">Contato</a>
    </nav>

  </div>
</header>
