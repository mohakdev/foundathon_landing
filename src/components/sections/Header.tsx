import Link from "next/link";

const Header = () => {
  const navLinks = [
    { href: "#overview", label: "Overview" },
    { href: "#rules", label: "Rules" },
    { href: "#release", label: "Release" },
    { href: "#champion", label: "Goodies" },
  ];

  return (
    <div className="border-b border-foreground/10 shadow-sm p-4 font-semibold sticky top-0 z-50 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="fncontainer flex items-center justify-between gap-6">
        <Link
          href="#overview"
          className="text-2xl md:text-3xl font-mono tracking-tighter"
        >
          Foundathon 3.0
        </Link>

        <div className="flex flex-1 items-center justify-end gap-6">
          <div className="hidden md:flex items-center gap-2">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-foreground px-2 py-1 hover:bg-foreground/10 rounded-sm transition duration-200"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="#release"
              className="hidden sm:inline-flex px-4 py-2 bg-gray-200 border-b-4 border-gray-300 rounded-md active:border-0 transition-discrete duration-150"
            >
              Release Clock
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-fnblue/70 border-b-4 border-fnblue rounded-md active:border-0 transition-discrete duration-150"
            >
              Register Team
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Header;
