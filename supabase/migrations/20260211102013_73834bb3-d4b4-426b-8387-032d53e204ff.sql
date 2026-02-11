
-- Create dashboards table
CREATE TABLE public.dashboards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  template TEXT NOT NULL DEFAULT 'blank',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dashboards" ON public.dashboards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own dashboards" ON public.dashboards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own dashboards" ON public.dashboards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own dashboards" ON public.dashboards FOR DELETE USING (auth.uid() = user_id);

-- Create dashboard_widgets table
CREATE TABLE public.dashboard_widgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  widget_type TEXT NOT NULL, -- 'status_card', 'uptime_chart', 'response_time_chart', 'alert_list', 'service_table'
  title TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb, -- stores service_id, integration_type, time_range, etc.
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 1,
  height INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own widgets" ON public.dashboard_widgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own widgets" ON public.dashboard_widgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own widgets" ON public.dashboard_widgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own widgets" ON public.dashboard_widgets FOR DELETE USING (auth.uid() = user_id);

-- Trigger for dashboards updated_at
CREATE TRIGGER update_dashboards_updated_at
BEFORE UPDATE ON public.dashboards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
