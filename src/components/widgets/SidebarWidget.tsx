interface SidebarWidgetProps {
  title: string;
  children: React.ReactNode;
}

export function SidebarWidget({ title, children }: SidebarWidgetProps) {
  return (
    <div className="card-base overflow-hidden">
      <div className="widget-header">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );
}
