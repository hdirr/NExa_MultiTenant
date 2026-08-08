export default function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="text-sm font-semibold text-muted hover:text-foreground border border-line rounded-lg px-3 py-1.5 transition"
      >
        Sair
      </button>
    </form>
  );
}
