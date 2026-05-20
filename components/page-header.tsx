type PageHeaderProps = {
  title: React.ReactNode;
  description?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  const headingFont = "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif";
  return (
    <header className="page-header">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="font-heading text-[hsl(var(--foreground))]"
            style={{ fontFamily: headingFont, fontWeight: 600, lineHeight: 1.25 }}
          >
            {title}
          </h1>
          {description && (
            <p
              className="text-[hsl(var(--muted-foreground))]"
              style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", marginTop: "0.25rem" }}
            >
              {description}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
