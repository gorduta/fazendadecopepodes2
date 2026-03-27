import { useEffect, useState } from "react";
import {
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  auth,
  db,
  initialProducts,
  productsCollection,
  storage,
} from "../lib/firebase";
import { currency } from "../lib/utils";

export default function ProductAdmin({ products, refreshProducts, isLoading }) {
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
    return <div className="rounded-[2rem] border border-[#dbc8ac] bg-white p-8 shadow-lg text-[#5c5147]">Verificando acesso...</div>;
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
        <button onClick={login} className="mt-4 rounded-2xl bg-[#244634] px-5 py-4 text-sm font-bold text-white">
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
          <button onClick={restoreDefaults} disabled={saving || uploadingImage} className="rounded-2xl border border-[#244634] px-4 py-3 text-sm font-bold text-[#244634] disabled:opacity-50">
            Restaurar padrão
          </button>
          <button onClick={logout} className="rounded-2xl bg-[#8b5e3c] px-4 py-3 text-sm font-bold text-white">
            Sair
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <input className="rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none" placeholder="Nome do produto" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none" placeholder="Preço" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <input className="rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none" placeholder="Selo (ex: Novo)" value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} />
        <input className="rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none" placeholder="Tamanho / volume" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
        <input className="rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none md:col-span-2" placeholder="Categoria" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />

        <div className="rounded-2xl border border-dashed border-[#cfbb9b] bg-[#fcfaf5] p-4 md:col-span-2">
          <label className="mb-3 flex items-center gap-2 text-sm font-bold text-[#244634]">
            <span>📤</span>
            Upload da imagem
          </label>
          <input type="file" accept="image/*" onChange={(e) => uploadImageFile(e.target.files?.[0])} className="block w-full text-sm text-[#5c5147]" />
          <p className="mt-2 text-xs text-[#7a6a59]">
            {uploadingImage ? "Enviando imagem..." : "Somente usuário autenticado consegue enviar imagem e salvar produto."}
          </p>
        </div>

        <input className="rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none md:col-span-2" placeholder="URL da imagem (preenchido automaticamente após upload)" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />

        {form.image && (
          <div className="md:col-span-2">
            <img src={form.image} alt="Prévia do produto" className="h-44 w-44 rounded-2xl border border-[#dbc8ac] object-cover" />
          </div>
        )}

        <textarea className="min-h-[120px] rounded-2xl border border-[#cfbb9b] bg-[#fcfaf5] px-4 py-4 outline-none md:col-span-2" placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button onClick={handleSaveProduct} disabled={saving || uploadingImage} className="inline-flex items-center gap-2 rounded-2xl bg-[#8b5e3c] px-5 py-4 text-sm font-bold text-white disabled:opacity-50">
          <span>{editingId ? "💾" : "➕"}</span>
          {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Adicionar produto"}
        </button>
        {editingId && <button onClick={resetForm} className="rounded-2xl border border-[#244634] px-5 py-4 text-sm font-bold text-[#244634]">Cancelar edição</button>}
      </div>

      <div className="mt-8 space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-[#5c5147]">Carregando produtos...</div>
        ) : (
          products.map((product) => (
            <div key={product.id} className="flex flex-col gap-4 rounded-2xl border border-[#decdb1] bg-[#fcfaf5] p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <img src={product.image} alt={product.name} className="h-20 w-20 rounded-2xl object-cover" />
                <div>
                  <h4 className="font-black text-[#244634]">{product.name}</h4>
                  <p className="text-sm text-[#5c5147]">{currency(product.price)}</p>
                  <p className="text-xs text-[#8b5e3c]">{product.size} • {product.category || "Sem categoria"}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => startEdit(product)} className="inline-flex items-center gap-2 rounded-2xl border border-[#244634] px-4 py-3 text-sm font-bold text-[#244634]">
                  <span>✏️</span>
                  Editar
                </button>
                <button onClick={() => removeProduct(product.id)} className="rounded-2xl border border-red-300 px-4 py-3 text-sm font-bold text-red-600">
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
