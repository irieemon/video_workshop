-- Sora2 Prompt Studio Database Schema
-- Copy this entire file and run it in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase Auth users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  usage_quota JSONB DEFAULT '{
    "projects": 3,
    "videos_per_month": 10,
    "consultations_per_month": 10
  }'::jsonb,
  usage_current JSONB DEFAULT '{
    "projects": 0,
    "videos_this_month": 0,
    "consultations_this_month": 0
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Series table
CREATE TABLE public.series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  visual_template JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Videos table
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  series_id UUID REFERENCES public.series(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  user_brief TEXT NOT NULL,
  agent_discussion JSONB NOT NULL,
  detailed_breakdown JSONB NOT NULL,
  optimized_prompt TEXT NOT NULL,
  character_count INTEGER NOT NULL,
  sora_video_url TEXT,
  platform TEXT CHECK (platform IN ('tiktok', 'instagram', 'both')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'published')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video performance table
CREATE TABLE public.video_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram')),
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  watch_time_seconds INTEGER,
  completion_rate DECIMAL(5,2),
  traffic_source TEXT CHECK (traffic_source IN ('fyp', 'profile', 'hashtag', 'share', 'other')),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hashtags table
CREATE TABLE public.hashtags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  suggested_by TEXT CHECK (suggested_by IN ('platform_expert', 'user', 'system')),
  volume_category TEXT CHECK (volume_category IN ('high', 'medium', 'niche')),
  performance_score DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent contributions (for learning system)
CREATE TABLE public.agent_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL CHECK (agent_name IN ('director', 'photography_director', 'platform_expert', 'social_media_marketer', 'music_producer')),
  suggestion_type TEXT,
  suggestion_text TEXT NOT NULL,
  was_applied BOOLEAN DEFAULT TRUE,
  performance_correlation DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_series_project_id ON public.series(project_id);
CREATE INDEX idx_videos_project_id ON public.videos(project_id);
CREATE INDEX idx_videos_series_id ON public.videos(series_id);
CREATE INDEX idx_video_performance_video_id ON public.video_performance(video_id);
CREATE INDEX idx_hashtags_video_id ON public.hashtags(video_id);
CREATE INDEX idx_agent_contributions_video_id ON public.agent_contributions(video_id);

-- Enable Row-Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_contributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for projects
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for series
CREATE POLICY "Users can view own series" ON public.series
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = series.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create series in own projects" ON public.series
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = series.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own series" ON public.series
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = series.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own series" ON public.series
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = series.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- RLS Policies for videos
CREATE POLICY "Users can view own videos" ON public.videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = videos.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create videos in own projects" ON public.videos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = videos.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own videos" ON public.videos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = videos.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own videos" ON public.videos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = videos.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- RLS Policies for video_performance
CREATE POLICY "Users can view performance of own videos" ON public.video_performance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.projects p ON v.project_id = p.id
      WHERE v.id = video_performance.video_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add performance to own videos" ON public.video_performance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.projects p ON v.project_id = p.id
      WHERE v.id = video_performance.video_id
      AND p.user_id = auth.uid()
    )
  );

-- RLS Policies for hashtags
CREATE POLICY "Users can view hashtags of own videos" ON public.hashtags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.projects p ON v.project_id = p.id
      WHERE v.id = hashtags.video_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add hashtags to own videos" ON public.hashtags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.projects p ON v.project_id = p.id
      WHERE v.id = hashtags.video_id
      AND p.user_id = auth.uid()
    )
  );

-- RLS Policies for agent_contributions
CREATE POLICY "Users can view contributions of own videos" ON public.agent_contributions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.projects p ON v.project_id = p.id
      WHERE v.id = agent_contributions.video_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add contributions to own videos" ON public.agent_contributions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.projects p ON v.project_id = p.id
      WHERE v.id = agent_contributions.video_id
      AND p.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_series_updated_at BEFORE UPDATE ON public.series
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to increment consultation usage
CREATE OR REPLACE FUNCTION increment_consultation_usage(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET usage_current = jsonb_set(
    usage_current,
    '{consultations_this_month}',
    to_jsonb((usage_current->>'consultations_this_month')::int + 1)
  )
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
