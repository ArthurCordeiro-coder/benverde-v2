"use client";
import React, { ChangeEvent, useEffect, useState } from "react";
import {
  Leaf,
  Sparkles,
  UploadCloud,
  AlertCircle,
  TrendingUp,
  Banana,
  PackageSearch,
  Tags,
} from "lucide-react";
import api from "@/lib/api";

function GlassCard({ title, value, subtitle, icon, trend }: any) {
  return (
    <div className="p-6 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)] flex flex-col relative overflow-hidden group hover:bg-white/[0.05] transition-all">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

      <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/5 shadow-inner">
          {icon}
        </div>
        {trend === "up" && <TrendingUp size={20} className="text-green-400" />}
        {trend === "down" && (
          <TrendingUp size={20} className="text-red-400 transform rotate-180" />
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-white tracking-tight mb-2">{value}</h3>
        <p className="text-xs font-medium text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const [saldoEstoque, setSaldoEstoque] = useState<number | null>(null);
  const [caixasDisponiveis, setCaixasDisponiveis] = useState<number | null>(null);
  const [precoMedio, setPrecoMedio] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const carregarDados = async () => {
    try {
      const [estoqueResponse, caixasResponse, precosResponse] = await Promise.all([
        api.get("/api/estoque/saldo"),
        api.get("/api/caixas"),
        api.get("/api/precos"),
      ]);

      const saldo = Number(estoqueResponse.data?.saldo ?? 0);
      setSaldoEstoque(Number.isFinite(saldo) ? saldo : 0);

      const caixas = Array.isArray(caixasResponse.data) ? caixasResponse.data : [];
      const totalCaixas = caixas.reduce((acc: number, item: any) => {
        const quantidade = Number(
          item?.Quantidade ??
            item?.quantidade ??
            item?.caixas_benverde ??
            item?.total ??
            item?.caixas_bananas ??
            0,
        );
        return acc + (Number.isFinite(quantidade) ? quantidade : 0);
      }, 0);
      setCaixasDisponiveis(totalCaixas);

      const precos = Array.isArray(precosResponse.data) ? precosResponse.data : [];
      const valoresValidos = precos
        .map((item: any) => Number(item?.Preco ?? item?.preco ?? 0))
        .filter((valor: number) => Number.isFinite(valor));
      const media =
        valoresValidos.length > 0
          ? valoresValidos.reduce((acc: number, valor: number) => acc + valor, 0) /
            valoresValidos.length
          : 0;
      setPrecoMedio(media);
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
    }
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });

    setUploading(true);
    try {
      const response = await api.post(
        "/api/upload/pedidos",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const processedFiles = Number(response.data?.processed_files ?? files.length);
      const savedRecords = Number(response.data?.saved_records ?? 0);
      await carregarDados();
      window.alert(
        `Importacao concluida com sucesso. ${processedFiles} arquivo(s) processado(s) e ${savedRecords} registro(s) salvo(s).`,
      );
    } catch (error: any) {
      console.error("Erro ao importar pedidos:", error);
      const detail = error?.response?.data?.detail ?? error?.message;
      window.alert(
        typeof detail === "string" ? detail : "Nao foi possivel importar os arquivos.",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  useEffect(() => {
    void carregarDados();
  }, []);

  return (
    <div className="space-y-8 text-gray-100 max-w-7xl mx-auto">
      {/* Header Mita */}
      <header className="p-6 rounded-3xl bg-white/[0.02] backdrop-blur-md border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-green-500 to-emerald-300 p-[2px] shrink-0">
            <div className="w-full h-full rounded-full bg-[#0a1f12] flex items-center justify-center">
              <Leaf size={20} className="text-green-400" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Oie! Eu sou a Mita, sua gerente de dados.
            </h2>
            <p className="text-sm text-gray-400">Como posso te ajudar hoje na Benverde?</p>
          </div>
        </div>

        <div className="text-left md:text-right w-full md:w-auto">
          <button className="w-full md:w-auto px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-medium text-green-300 transition-all backdrop-blur-lg flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(74,222,128,0.1)] hover:shadow-[0_0_25px_rgba(74,222,128,0.2)]">
            <Sparkles size={16} />
            Atualizar Dados
          </button>
        </div>
      </header>

      {/* Alerta */}
      <div className="p-5 rounded-2xl bg-amber-500/10 backdrop-blur-xl border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center gap-4 text-amber-200 shadow-[0_8px_32px_rgba(245,158,11,0.05)]">
        <AlertCircle size={24} className="text-amber-400 shrink-0" />
        <p className="text-sm font-medium">
          Sem dados de progresso recentes. Cadastre metas e clique em Atualizar Dados para
          gerar os graficos.
        </p>
      </div>

      {/* Acao Importar */}
      <input
        type="file"
        multiple
        accept=".pdf,.zip"
        className="hidden"
        id="upload-pedidos"
        onChange={handleUpload}
      />
      <label
        htmlFor="upload-pedidos"
        className={`w-full py-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 backdrop-blur-xl flex flex-col items-center justify-center gap-2 text-gray-300 hover:text-white transition-all group shadow-sm hover:shadow-lg ${
          uploading ? "cursor-wait opacity-70 pointer-events-none" : "cursor-pointer"
        }`}
      >
        <div className="p-3 rounded-full bg-white/5 group-hover:bg-green-500/20 group-hover:text-green-400 transition-colors">
          <UploadCloud size={24} />
        </div>
        <span className="font-medium">
          {uploading ? "Enviando..." : "Importar Novo Pedido / Progresso"}
        </span>
      </label>

      {/* Grid de Cards Glassmorphism */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard
          title="Saldo de Estoque"
          value={saldoEstoque !== null ? `${saldoEstoque.toLocaleString("pt-BR")} kg` : "Carregando..."}
          subtitle="+12% em relacao a ontem"
          icon={<Banana className="text-yellow-400" size={24} />}
          trend="up"
        />
        <GlassCard
          title="Caixas Disponiveis"
          value={caixasDisponiveis !== null ? `${caixasDisponiveis} un` : "Carregando..."}
          subtitle="Estoque critico na Loja 1"
          icon={<PackageSearch className="text-blue-400" size={24} />}
          trend="down"
        />
        <GlassCard
          title="Preco Medio"
          value={precoMedio !== null ? `R$ ${precoMedio.toFixed(2).replace(".", ",")}` : "Carregando..."}
          subtitle="Concorrencia: R$ 82,90"
          icon={<Tags className="text-emerald-400" size={24} />}
          trend="neutral"
        />
      </div>
    </div>
  );
}
