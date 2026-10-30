type PageHeaderProps = {
  title: string;
  description?: string;
  children?: React.ReactNode;
};

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="site-container page-header-inner">
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-lead">{description}</p> : null}
        {children}
      </div>
    </header>
  );
}
