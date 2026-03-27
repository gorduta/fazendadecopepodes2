import { useEffect, useMemo, useState } from "react";
import { addDoc, getDoc, getDocs, orderBy, query, setDoc } from "firebase/firestore";
import AdminPanel from "./components/AdminPanel";
import {
  STORE,
  buildWhatsAppMessage,
  calculateShipping,
  contentDoc,
  currency,
  defaultContent,
  formatCep,
  initialProducts,
  productsCollection,
} from "./lib/store-core";

export default function App() {
  const [cart, setCart] = useState([]);
  const [cep, setCep] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [showPix, setShowPix] = useState(false);
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [content, setContent] = useState(defaultContent);

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

  const loadContent = async () => {
    try {
      const snap = await getDoc(contentDoc);
      if (!snap.exists()) {
        await setDoc(contentDoc, defaultContent);
        setContent(defaultContent);
      } else {
        setContent({ ...defaultContent, ...snap.data() });
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    refreshProducts();
    loadContent();
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
            <img src="/logo.png" alt="Logo Fazenda de Copepodes" className="h-12 w-12 rounded-full bg-white object-contain" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#d7c08d]">Aquário marinho</p>
              <h1 className="text-2xl font-black md:text-3xl">{STORE.name}</h1>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-semibold md:flex">
            <a href="#produtos" className="transition hover:text-[#d7c08d]">Produtos</a>
            <a href="#beneficios" className="transition hover:text-[#d7c08d]">Benefícios</a>
            <a href="#frete" className="transition hover:text-[#d7c08d]">Frete</a>
            <a href="#painel" className="transition hover:text-[#d7c08d]">Painel</a>
            <a href="#contato" className="transition hover:text-[#d7c08d]">Contato</a>
          </nav>

          <button onClick={() => setShowCart(true)} className="relative rounded-2xl border border-white/20 bg-white/10 p-3 transition hover:bg-white/20" aria-label="Abrir carrinho">
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
            {content.hero.subtitle}
          </span>
          <h2 className="mt-5 text-4xl font-black leading-tight text-[#244634] md:text-6xl">
            {content.hero.title}
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[#5c5147]">
            {content.hero.text}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#produtos" className="rounded-2xl bg-[#8b5e3c] px-6 py-4 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5">
              {content.hero.button1}
            </a>
            <a href={`https://wa.me/${STORE.whatsapp}`} className="rounded-2xl border border-[#244634] px-6 py-4 text-sm font-bold text-[#244634] transition hover:bg-[#244634] hover:text-white">
              {content.hero.button2}
            </a>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[#d8c8af] bg-gradient-to-br from-[#f7f0e4] to-white p-5 shadow-2xl">
          <div className="overflow-hidden rounded-[1.5rem] border border-[#e7dcc9] bg-white">
            <img src={content.hero.image} alt="Banner da loja" className="h-[420px] w-full object-cover" />
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
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar produto, descrição ou categoria" className="w-full rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] py-4 pl-11 pr-4 outline-none focus:border-[#8b5e3c]" />
          </div>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none focus:border-[#8b5e3c]">
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {isLoadingProducts ? (
          <div className="text-sm text-[#5c5147]">Carregando produtos...</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visibleProducts.map((product) => (
              <article key={product.id} className="overflow-hidden rounded-[2rem] border border-[#dbc8ac] bg-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl">
                <div className="relative">
                  <img src={product.image} alt={product.name} className="h-72 w-full object-cover" />
                  <span className="absolute left-4 top-4 rounded-full bg-[#244634] px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-[#f1dfb3]">{product.badge}</span>
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-2xl font-black text-[#2a241f]">{product.name}</h4>
                      <p className="mt-1 text-sm font-semibold text-[#8b5e3c]">{product.size} • {product.category || "Sem categoria"}</p>
                    </div>
                    <span className="whitespace-nowrap rounded-full bg-[#f8f1df] px-3 py-2 text-sm font-black text-[#244634]">{currency(product.price)}</span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[#5c5147]">{product.description}</p>
                  <button onClick={() => addToCart(product)} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#244634] px-4 py-4 text-sm font-bold text-white transition hover:opacity-95">
                    <span>🛒</span>
                    Adicionar ao carrinho
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="beneficios" className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <div className="grid gap-6 md:grid-cols-3">
          {content.features.map((item, index) => (
            <div key={index} className="rounded-[2rem] border border-[#dbc8ac] bg-white p-7 shadow-md">
              <div className="text-3xl">{item.emoji}</div>
              <h4 className="mt-4 text-xl font-black text-[#244634]">{item.title}</h4>
              <p className="mt-3 text-sm leading-7 text-[#5c5147]">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="painel" className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <AdminPanel products={products} refreshProducts={refreshProducts} isLoading={isLoadingProducts} />
      </section>

      <section id="contato" className="mx-auto max-w-7xl px-4 pb-20 pt-10 md:px-6 md:pt-14">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-[2rem] border border-[#dbc8ac] bg-white p-8 shadow-lg">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8b5e3c]">Contato</p>
            <h3 className="mt-2 text-3xl font-black text-[#244634]">Atendimento direto</h3>
            <div className="mt-6 space-y-3 text-sm leading-7 text-[#5c5147]">
              <p><strong>WhatsApp:</strong> {content.contact.whatsappLabel}</p>
              <p><strong>CEP de origem:</strong> {STORE.originCep}</p>
              <p><strong>Instagram:</strong> {content.contact.instagram}</p>
              <p><strong>E-mail:</strong> {content.contact.email}</p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#dbc8ac] bg-[#f8f1df] p-8 shadow-lg">
            <h3 className="text-2xl font-black text-[#244634]">Como usar o painel</h3>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-[#5c5147]">
              <li>• Agora o painel usa login com Firebase Authentication.</li>
              <li>• Só usuário autenticado consegue editar produtos e conteúdo.</li>
              <li>• Banner, tópicos e contato podem ser alterados sem mexer no código.</li>
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
              <button onClick={() => setShowCart(false)} className="rounded-full border border-[#d7c6a9] p-2 text-[#244634]">✕</button>
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
                  <input value={formatCep(cep)} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" className="w-full rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none focus:border-[#8b5e3c]" />
                </div>

                <div className="mt-6 rounded-2xl bg-[#244634] p-5 text-white">
                  <div className="flex items-center justify-between text-sm"><span>Subtotal</span><strong>{currency(subtotal)}</strong></div>
                  <div className="mt-2 flex items-center justify-between text-sm"><span>Frete</span><strong>{currency(shippingInfo?.shipping || 0)}</strong></div>
                  <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-4 text-lg font-black"><span>Total</span><span>{currency(total)}</span></div>
                </div>

                <div className="mt-6 grid gap-3">
                  <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl bg-[#25d366] px-4 py-4 text-sm font-bold text-white"><span>💬</span>Finalizar pelo WhatsApp</a>
                  <button onClick={() => setShowPix(true)} className="flex items-center justify-center gap-2 rounded-2xl bg-[#8b5e3c] px-4 py-4 text-sm font-bold text-white"><span>📱</span>Pagar com Pix</button>
                  <a href={STORE.mercadoPagoLink} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl border border-[#244634] px-4 py-4 text-sm font-bold text-[#244634]"><span>💳</span>Pagar com Mercado Pago</a>
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
              <button onClick={() => setShowPix(false)} className="rounded-full border border-[#d7c6a9] p-2 text-[#244634]">✕</button>
            </div>
            <div className="mt-5 rounded-2xl bg-[#f8f1df] p-5 text-sm leading-7 text-[#5c5147]">
              <p><strong>Valor atual do pedido:</strong> {currency(total)}</p>
              <p className="mt-2"><strong>Chave Pix:</strong> {STORE.pixKey}</p>
              <p className="mt-2">Pagamento manual via Pix com conferência no atendimento.</p>
            </div>
            <button onClick={() => navigator.clipboard?.writeText(STORE.pixKey)} className="mt-5 w-full rounded-2xl bg-[#244634] px-4 py-4 text-sm font-bold text-white">Copiar chave Pix</button>
          </div>
        </div>
      )}

      <footer className="mt-12 border-t border-[#d6c29f] bg-[#244634] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-3 md:px-6">
          <div>
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Logo Fazenda de Copepodes" className="h-12 w-12 rounded-full bg-white object-contain" />
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#d7c08d]">{STORE.name}</p>
                <p className="text-sm text-white/75">Cultivo natural para aquário marinho</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-[#d7c08d]">Contato</h4>
            <div className="mt-4 space-y-3 text-sm text-white/85">
              <a href={`https://wa.me/${STORE.whatsapp}`} className="flex items-center gap-2 hover:text-white"><span>💬</span> {content.contact.whatsappLabel}</a>
              <a href={STORE.instagramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white"><span>📷</span> {content.contact.instagram}</a>
              <p>{content.contact.email}</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-[#d7c08d]">Versão</h4>
            <div className="mt-4 space-y-2 text-sm text-white/85">
              <p>Build: {STORE.build}</p>
              <p>{content.footer.note}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
