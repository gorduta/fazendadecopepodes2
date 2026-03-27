import { useState, useMemo } from "react";

export default function FazendaCopepodes() {
  const [cart, setCart] = useState([]);
  const [cep, setCep] = useState("");

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const shippingInfo = { shipping: 0 };
  const total = subtotal + (shippingInfo?.shipping || 0);

  return (
    <div className="min-h-screen bg-[#f4efe6] text-[#2a241f]">

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-[#cdb693] bg-[#244634]/95 text-white backdrop-blur">
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

      {/* CONTEÚDO TESTE */}
      <div className="p-10 text-center">
        <h2 className="text-3xl font-bold text-[#244634]">
          Site funcionando 🚀
        </h2>
        <p className="mt-4">
          Agora o logo deve aparecer no topo corretamente.
        </p>
      </div>

    </div>
  );
}
