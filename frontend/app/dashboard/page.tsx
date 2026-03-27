export default function DashboardHomePage() {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-medium text-emerald-700">Bem-vindo de volta</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">Painel Benverde</h2>
        <p className="mt-2 text-slate-600">
          Aqui vamos acompanhar os principais indicadores do seu negocio.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="h-40 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200" />
        <div className="h-40 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200" />
        <div className="h-40 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200" />
        <div className="h-40 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200" />
      </div>
    </section>
  );
}
