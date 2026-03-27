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
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

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
const auth = getAuth(app);
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
  build: "v1.7.0",
};

const initialProducts = [
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

function currency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizeCep(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 8);
}

function formatCep(value) {
  const cep = normalizeCep(value);
  if (cep.length <= 5) return cep;
  return `${cep.slice(0, 5)}-${cep.slice(5)}`;
}

function calculateShipping(cep, subtotal) {
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

function buildWhatsAppMessage(items, subtotal, shippingInfo, cep) {
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

function ProductAdmin({ products, refreshProducts, isLoading }) {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    price: "",
    badge: "Novo",
    size: "",
    category: "",
    description: "",
    image: "",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setForm({
      name: "",
      price: "",
      badge: "Novo",
      size: "",
      category: "",
      description: "",
      image: "",
    });
    setEditingId(null);
  };

  const login = async () => {
    try {
      setAuthError("");
      setAuthLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setAuthError("Login inválido. Confira e-mail e senha do Firebase Auth.");
      console.error(error);
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setAuthError("");
  };

  const uploadImageFile = async (file) => {
    if (!file) return;
    try {
      setUploadingImage(true);
      const fileName = `${Date.now()}-${file.name}`;
      const storageRef = ref(storage, `products/${fileName}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setForm((current) => ({ ...current, image: downloadURL }));
    } catch (error) {
      alert("Não foi possível enviar a imagem.");
      console.error(error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!form.name || !form.price || !form.description || !form.image) {
      alert("Preencha nome, preço, descrição e imagem.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name,
        price: Number(form.price),
        badge: form.badge || "Novo",
        size: form.size || "Unidade",
        category: form.category || "Sem categoria",
        description: form.description,
        image: form.image,
      };

      if (editingId) {
        await updateDoc(doc(db, "products", editingId), payload);
      } else {
        await addDoc(productsCollection, { ...payload, createdAt: Date.now() });
      }

      resetForm();
      await refreshProducts();
    } catch (error) {
      alert("Não foi possível salvar o produto.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name || "",
      price: String(product.price || ""),
      badge: product.badge || "Novo",
      size: product.size || "",
      category: product.category || "",
      description: product.description || "",
      image: product.image || "",
    });
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const removeProduct = async (id) => {
    try {
      await deleteDoc(doc(db, "products", id));
      if (editingId === id) resetForm();
      await refreshProducts();
    } catch (error) {
      alert("Não foi possível remover o produto.");
      console.error(error);
    }
  };

  const restoreDefaults = async () => {
    try {
      setSaving(true);
      const snapshot = await getDocs(productsCollection);
      await Promise.all(snapshot.docs.map((item) => deleteDoc(doc(db, "products", item.id))));
      await Promise.all(initialProducts.map((product) => addDoc(productsCollection, product)));
      resetForm();
      await refreshProducts();
    } catch (error) {
      alert("Não foi possível restaurar os produtos padrão.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="rounded-[2rem] border border-[#dbc8ac] bg-white p-8 shadow-lg text-[#5c5147]">
        Verificando acesso...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-[2rem] border border-[#dbc8ac] bg-white p-8 shadow-lg">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8b5e3c]">Painel protegido</p>
        <h3 className="mt-2 text-3xl font-black text-[#244634]">Entrar com Firebase Auth</h3>
        <p className="mt-4 text-sm leading-7 text-[#5c5147]">
          Agora o painel não usa mais senha fixa no código. Entre com o usuário criado no Firebase Authentication.
        </p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Seu e-mail"
          className="mt-5 w-full rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none focus:border-[#8b5e3c]"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Sua senha"
          className="mt-4 w-full rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none focus:border-[#8b5e3c]"
        />
        {authError && <p className="mt-3 text-sm text-red-600">{authError}</p>}
        <button
          onClick={login}
          className="mt-4 rounded-2xl bg-[#244634] px-5 py-4 text-sm font-bold text-white"
        >
          Entrar no painel
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-[#dbc8ac] bg-white p-8 shadow-lg">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8b5e3c]">Painel protegido</p>
          <h3 className="mt-2 text-3xl font-black text-[#244634]">Gerenciar produtos</h3>
          <p className="mt-2 text-sm text-[#5c5147]">Logado como {user.email}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={restoreDefaults}
            disabled={saving || uploadingImage}
            className="rounded-2xl border border-[#244634] px-4 py-3 text-sm font-bold text-[#244634] disabled:opacity-50"
          >
            Restaurar padrão
          </button>
          <button
            onClick={logout}
            className="rounded-2xl bg-[#8b5e3c] px-4 py-3 text-sm font-bold text-white"
          >
            Sair
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <input
          className="rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none"
          placeholder="Nome do produto"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none"
          placeholder="Preço"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />
        <input
          className="rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none"
          placeholder="Selo (ex: Novo)"
          value={form.badge}
          onChange={(e) => setForm({ ...form, badge: e.target.value })}
        />
        <input
          className="rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none"
          placeholder="Tamanho / volume"
          value={form.size}
          onChange={(e) => setForm({ ...form, size: e.target.value })}
        />
        <input
          className="rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none md:col-span-2"
          placeholder="Categoria"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />

        <div className="rounded-2xl border border-dashed border-[#cfbb9b] bg-[#fcfaf5] p-4 md:col-span-2">
          <label className="mb-3 flex items-center gap-2 text-sm font-bold text-[#244634]">
            <span>📤</span>
            Upload da imagem
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => uploadImageFile(e.target.files?.[0])}
            className="block w-full text-sm text-[#5c5147]"
          />
          <p className="mt-2 text-xs text-[#7a6a59]">
            {uploadingImage ? "Enviando imagem..." : "Somente usuário autenticado consegue enviar imagem e salvar produto."}
          </p>
        </div>

        <input
          className="rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none md:col-span-2"
          placeholder="URL da imagem (preenchido automaticamente após upload)"
          value={form.image}
          onChange={(e) => setForm({ ...form, image: e.target.value })}
        />

        {form.image && (
          <div className="md:col-span-2">
            <img
              src={form.image}
              alt="Prévia do produto"
              className="h-44 w-44 rounded-2xl border border-[#dbc8ac] object-cover"
            />
          </div>
        )}

        <textarea
          className="min-h-[120px] rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none md:col-span-2"
          placeholder="Descrição"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          onClick={handleSaveProduct}
          disabled={saving || uploadingImage}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#8b5e3c] px-5 py-4 text-sm font-bold text-white disabled:opacity-50"
        >
          <span>{editingId ? "💾" : "➕"}</span>
          {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Adicionar produto"}
        </button>

        {editingId && (
          <button
            onClick={resetForm}
            className="rounded-2xl border border-[#244634] px-5 py-4 text-sm font-bold text-[#244634]"
          >
            Cancelar edição
          </button>
        )}
      </div>

      <div className="mt-8 space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-[#5c5147]">Carregando produtos...</div>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className="flex flex-col gap-4 rounded-2xl border border-[#decdb1] bg-[#fcfaf5] p-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="flex items-center gap-4">
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-20 w-20 rounded-2xl object-cover"
                />
                <div>
                  <h4 className="font-black text-[#244634]">{product.name}</h4>
                  <p className="text-sm text-[#5c5147]">{currency(product.price)}</p>
                  <p className="text-xs text-[#8b5e3c]">
                    {product.size} • {product.category || "Sem categoria"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => startEdit(product)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#244634] px-4 py-3 text-sm font-bold text-[#244634]"
                >
                  <span>✏️</span>
                  Editar
                </button>
                <button
                  onClick={() => removeProduct(product.id)}
                  className="rounded-2xl border border-red-300 px-4 py-3 text-sm font-bold text-red-600"
                >
                  Remover
                </button>
              </div>
            </div>
          ))
        )}
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  const refreshProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const q = query(productsCollection, orderBy("createdAt", "asc"));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

      if (items.length === 0) {
        await Promise.all(initialProducts.map((product) => addDoc(productsCollection, product)));
        const seededSnapshot = await getDocs(q);
        const seededItems = seededSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        setProducts(seededItems);
      } else {
        setProducts(items);
      }
    } catch (error) {
      console.error(error);
      alert("Não foi possível carregar os produtos do Firebase.");
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    refreshProducts();
  }, []);

  const addToCart = (product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...current, { ...product, quantity: 1 }];
    });
    setShowCart(true);
  };

  const updateQuantity = (id, amount) => {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + amount } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const itemsCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const shippingInfo = useMemo(() => calculateShipping(cep, subtotal), [cep, subtotal]);
  const total = subtotal + (shippingInfo?.shipping || 0);

  const whatsappUrl = `https://wa.me/${STORE.whatsapp}?text=${buildWhatsAppMessage(
    cart,
    subtotal,
    shippingInfo,
    formatCep(cep)
  )}`;

  const categories = [
    "Todos",
    ...new Set(products.map((product) => product.category || "Sem categoria")),
  ];

  const visibleProducts = products.filter((product) => {
    const text = `${product.name} ${product.description} ${product.category || ""}`.toLowerCase();
    const matchesSearch = text.includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "Todos" || (product.category || "Sem categoria") === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#f4efe6] text-[#2a241f]">
      <header className="sticky top-0 z-40 border-b border-[#cdb693] bg-[#244634]/95 text-white backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Logo Fazenda de Copepodes"
              className="h-12 w-12 object-contain rounded-full bg-white"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#d7c08d]">Aquário marinho</p>
              <h1 className="text-2xl font-black md:text-3xl">Fazenda de Copepodes</h1>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-semibold md:flex">
            <a href="#produtos" className="transition hover:text-[#d7c08d]">Produtos</a>
            <a href="#beneficios" className="transition hover:text-[#d7c08d]">Benefícios</a>
            <a href="#frete" className="transition hover:text-[#d7c08d]">Frete</a>
            <a href="#painel" className="transition hover:text-[#d7c08d]">Painel</a>
            <a href="#contato" className="transition hover:text-[#d7c08d]">Contato</a>
          </nav>

          <button
            onClick={() => setShowCart(true)}
            className="relative rounded-2xl border border-white/20 bg-white/10 p-3 transition hover:bg-white/20"
            aria-label="Abrir carrinho"
          >
            <span>🛒</span>
            {itemsCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#d7c08d] text-xs font-bold text-[#244634]">
                {itemsCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-2 md:items-center md:px-6 md:py-20">
        <div>
          <span className="inline-flex items-center rounded-full border border-[#b08a5a] bg-[#f8f1df] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#7b552d]">
            Cultivo natural e envio rápido
          </span>
          <h2 className="mt-5 text-4xl font-black leading-tight text-[#244634] md:text-6xl">
            Alimento vivo de confiança para seu aquário marinho
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[#5c5147]">
            Uma loja com identidade própria, cores inspiradas no seu logo e foco total em copepodes,
            praticidade no pedido e checkout rápido por WhatsApp, Pix e Mercado Pago.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#produtos"
              className="rounded-2xl bg-[#8b5e3c] px-6 py-4 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5"
            >
              Comprar agora
            </a>
            <a
              href={`https://wa.me/${STORE.whatsapp}`}
              className="rounded-2xl border border-[#244634] px-6 py-4 text-sm font-bold text-[#244634] transition hover:bg-[#244634] hover:text-white"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[#d8c8af] bg-gradient-to-br from-[#f7f0e4] to-white p-5 shadow-2xl">
          <div className="overflow-hidden rounded-[1.5rem] border border-[#e7dcc9] bg-white">
            <img
              src="https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&w=1400&q=80"
              alt="Aquário marinho"
              className="h-[420px] w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section id="produtos" className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8b5e3c]">Loja</p>
            <h3 className="mt-2 text-3xl font-black text-[#244634] md:text-4xl">Produtos em destaque</h3>
          </div>
          <p className="max-w-xl text-sm leading-7 text-[#5c5147]">
            Busque por nome, descrição ou filtre por categoria para encontrar mais rápido.
          </p>
        </div>

        <div className="mb-8 grid gap-4 rounded-[2rem] border border-[#dbc8ac] bg-white p-5 shadow-md md:grid-cols-[1fr_220px]">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8b5e3c]">🔎</span>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar produto, descrição ou categoria"
              className="w-full rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] py-4 pl-11 pr-4 outline-none focus:border-[#8b5e3c]"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none focus:border-[#8b5e3c]"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {isLoadingProducts ? (
          <div className="flex items-center gap-2 text-sm text-[#5c5147]">Carregando produtos...</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visibleProducts.map((product) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-[2rem] border border-[#dbc8ac] bg-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative">
                  <img src={product.image} alt={product.name} className="h-72 w-full object-cover" />
                  <span className="absolute left-4 top-4 rounded-full bg-[#244634] px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-[#f1dfb3]">
                    {product.badge}
                  </span>
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-2xl font-black text-[#2a241f]">{product.name}</h4>
                      <p className="mt-1 text-sm font-semibold text-[#8b5e3c]">
                        {product.size} • {product.category || "Sem categoria"}
                      </p>
                    </div>
                    <span className="whitespace-nowrap rounded-full bg-[#f8f1df] px-3 py-2 text-sm font-black text-[#244634]">
                      {currency(product.price)}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[#5c5147]">{product.description}</p>
                  <button
                    onClick={() => addToCart(product)}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#244634] px-4 py-4 text-sm font-bold text-white transition hover:opacity-95"
                  >
                    <span>🛒</span>
                    Adicionar ao carrinho
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {!isLoadingProducts && visibleProducts.length === 0 && (
          <div className="mt-6 rounded-2xl border border-[#dbc8ac] bg-white p-8 text-center text-sm text-[#5c5147] shadow-md">
            Nenhum produto encontrado para essa busca.
          </div>
        )}
      </section>

      <section id="beneficios" className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <div className="grid gap-6 md:grid-cols-3">
          {[
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
          ].map((item) => (
            <div key={item.title} className="rounded-[2rem] border border-[#dbc8ac] bg-white p-7 shadow-md">
              <div className="text-3xl">{item.emoji}</div>
              <h4 className="mt-4 text-xl font-black text-[#244634]">{item.title}</h4>
              <p className="mt-3 text-sm leading-7 text-[#5c5147]">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="frete" className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-[#dbc8ac] bg-white p-8 shadow-lg">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8b5e3c]">Frete</p>
            <h3 className="mt-2 text-3xl font-black text-[#244634]">Simulação no carrinho</h3>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#5c5147]">
              A loja usa o CEP de origem <strong>{STORE.originCep}</strong> para referência logística.
            </p>
            <div className="mt-6 max-w-md">
              <label className="mb-2 block text-sm font-bold text-[#244634]">CEP de entrega</label>
              <input
                value={formatCep(cep)}
                onChange={(e) => setCep(e.target.value)}
                placeholder="00000-000"
                className="w-full rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 text-base outline-none focus:border-[#8b5e3c]"
              />
            </div>
            {shippingInfo && (
              <div className="mt-6 rounded-2xl bg-[#f8f1df] p-5 text-sm text-[#4b4035]">
                <p><strong>Serviço:</strong> {shippingInfo.service}</p>
                <p className="mt-1"><strong>Prazo estimado:</strong> {shippingInfo.eta}</p>
                <p className="mt-1"><strong>Valor estimado:</strong> {currency(shippingInfo.shipping)}</p>
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-[#244634] bg-[#244634] p-8 text-white shadow-xl">
            <h3 className="text-2xl font-black">Pagamentos</h3>
            <p className="mt-4 text-sm leading-7 text-white/80">
              Finalização pronta com dois caminhos: atendimento assistido por WhatsApp e pagamento online.
            </p>
            <div className="mt-6 space-y-3">
              <button
                onClick={() => setShowPix(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#8b5e3c] px-4 py-4 text-sm font-bold text-white"
              >
                <span>📱</span>
                Ver pagamento via Pix
              </button>
              <a
                href={STORE.mercadoPagoLink}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-4 text-sm font-bold text-white"
              >
                <span>💳</span>
                Pagar com Mercado Pago
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="painel" className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <ProductAdmin products={products} refreshProducts={refreshProducts} isLoading={isLoadingProducts} />
      </section>

      <section id="contato" className="mx-auto max-w-7xl px-4 pb-20 pt-10 md:px-6 md:pt-14">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-[2rem] border border-[#dbc8ac] bg-white p-8 shadow-lg">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8b5e3c]">Contato</p>
            <h3 className="mt-2 text-3xl font-black text-[#244634]">Atendimento direto</h3>
            <div className="mt-6 space-y-3 text-sm leading-7 text-[#5c5147]">
              <p><strong>WhatsApp:</strong> {STORE.whatsappLabel}</p>
              <p><strong>CEP de origem:</strong> {STORE.originCep}</p>
              <p><strong>Instagram:</strong> {STORE.instagram}</p>
              <p><strong>E-mail:</strong> {STORE.email}</p>
            </div>
            <a
              href={`https://wa.me/${STORE.whatsapp}`}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#25d366] px-5 py-4 text-sm font-bold text-white"
            >
              <span>💬</span>
              Chamar no WhatsApp
            </a>
          </div>

          <div className="rounded-[2rem] border border-[#dbc8ac] bg-[#f8f1df] p-8 shadow-lg">
            <h3 className="text-2xl font-black text-[#244634]">Como usar o painel</h3>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-[#5c5147]">
              <li>• Agora o painel usa login com Firebase Authentication.</li>
              <li>• Só usuário autenticado consegue editar produtos.</li>
              <li>• Proteja Firestore e Storage pelas regras abaixo.</li>
            </ul>
          </div>
        </div>
      </section>

      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="h-full w-full max-w-xl overflow-y-auto bg-[#fffaf1] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e1d3bb] pb-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8b5e3c]">Seu carrinho</p>
                <h3 className="text-2xl font-black text-[#244634]">Finalizar pedido</h3>
              </div>
              <button onClick={() => setShowCart(false)} className="rounded-full border border-[#d7c6a9] p-2 text-[#244634]">
                <span>✕</span>
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto text-5xl">🛒</div>
                <p className="mt-4 text-sm text-[#5c5147]">Seu carrinho está vazio.</p>
              </div>
            ) : (
              <>
                <div className="mt-6 space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-[#decdb1] bg-white p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-black text-[#244634]">{item.name}</h4>
                          <p className="mt-1 text-sm text-[#5c5147]">{currency(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-2 rounded-full border border-[#d5c29f] px-2 py-1">
                          <button onClick={() => updateQuantity(item.id, -1)} className="rounded-full p-1 text-[#244634]">-</button>
                          <span className="min-w-6 text-center text-sm font-bold">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="rounded-full p-1 text-[#244634]">+</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-[#decdb1] bg-white p-5">
                  <label className="mb-2 block text-sm font-bold text-[#244634]">CEP para estimativa de frete</label>
                  <input
                    value={formatCep(cep)}
                    onChange={(e) => setCep(e.target.value)}
                    placeholder="00000-000"
                    className="w-full rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none focus:border-[#8b5e3c]"
                  />
                </div>

                <div className="mt-6 rounded-2xl bg-[#244634] p-5 text-white">
                  <div className="flex items-center justify-between text-sm">
                    <span>Subtotal</span>
                    <strong>{currency(subtotal)}</strong>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span>Frete</span>
                    <strong>{currency(shippingInfo?.shipping || 0)}</strong>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-4 text-lg font-black">
                    <span>Total</span>
                    <span>{currency(total)}</span>
                  </div>
                  {shippingInfo && (
                    <p className="mt-3 text-xs text-white/80">Prazo estimado: {shippingInfo.eta}</p>
                  )}
                </div>

                <div className="mt-6 grid gap-3">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-2xl bg-[#25d366] px-4 py-4 text-sm font-bold text-white"
                  >
                    <span>💬</span>
                    Finalizar pelo WhatsApp
                  </a>
                  <button
                    onClick={() => setShowPix(true)}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-[#8b5e3c] px-4 py-4 text-sm font-bold text-white"
                  >
                    <span>📱</span>
                    Pagar com Pix
                  </button>
                  <a
                    href={STORE.mercadoPagoLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-2xl border border-[#244634] px-4 py-4 text-sm font-bold text-[#244634]"
                  >
                    <span>💳</span>
                    Pagar com Mercado Pago
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showPix && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8b5e3c]">Pagamento</p>
                <h3 className="mt-2 text-2xl font-black text-[#244634]">Pix</h3>
              </div>
              <button onClick={() => setShowPix(false)} className="rounded-full border border-[#d7c6a9] p-2 text-[#244634]">
                <span>✕</span>
              </button>
            </div>
            <div className="mt-5 rounded-2xl bg-[#f8f1df] p-5 text-sm leading-7 text-[#5c5147]">
              <p><strong>Valor atual do pedido:</strong> {currency(total)}</p>
              <p className="mt-2"><strong>Chave Pix:</strong> {STORE.pixKey}</p>
              <p className="mt-2">Pagamento manual via Pix com conferência no atendimento.</p>
            </div>
            <button
              onClick={() => navigator.clipboard?.writeText(STORE.pixKey)}
              className="mt-5 w-full rounded-2xl bg-[#244634] px-4 py-4 text-sm font-bold text-white"
            >
              Copiar chave Pix
            </button>
          </div>
        </div>
      )}

      <footer className="mt-12 border-t border-[#d6c29f] bg-[#244634] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-3 md:px-6">
          <div>
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Logo Fazenda de Copepodes"
                className="h-12 w-12 rounded-full bg-white object-contain"
              />
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#d7c08d]">
                  Fazenda de Copepodes
                </p>
                <p className="text-sm text-white/75">Cultivo natural para aquário marinho</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-[#d7c08d]">Contato</h4>
            <div className="mt-4 space-y-3 text-sm text-white/85">
              <a href={`https://wa.me/${STORE.whatsapp}`} className="flex items-center gap-2 hover:text-white">
                <span>💬</span> {STORE.whatsappLabel}
              </a>
              <a href={STORE.instagramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white">
                <span>📷</span> {STORE.instagram}
              </a>
              <p>{STORE.email}</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-[#d7c08d]">Versão</h4>
            <div className="mt-4 space-y-2 text-sm text-white/85">
              <p>Build: {STORE.build}</p>
              <p>Painel protegido com Firebase Authentication.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
