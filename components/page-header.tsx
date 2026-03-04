type PageHeaderProps = {
  title: React.ReactNode;
  description?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-[hsl(var(--foreground))]">
            {title}
          </h1>
          {description && (
            <p className="text-[hsl(var(--muted-foreground))]">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
