-- Video sync is now triggered by news-sync-articles after each successful run.
-- Drop the standalone 30-minute cron to avoid duplicate scrapes.

do $$
begin
  begin
    perform cron.unschedule('news-sync-videos');
  exception when others then
    raise notice 'news-sync-videos cron was not scheduled: %', sqlerrm;
  end;
end $$;
