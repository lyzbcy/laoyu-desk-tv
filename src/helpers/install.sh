#!/bin/sh
set -eu
job=$1
old_pid=$2
package=$3
expected_hash=$4
version=$5
target=$6
exe=$7
token=$8
parent=$(dirname "$target")
stage=''
backup="$parent/.paid-to-watch-backup-$token.app"
result() { printf '{"token":"%s","status":"%s","version":"%s"}' "$token" "$1" "$version" > "$job/result.json"; }
fail() {
 trap - EXIT HUP INT TERM
 result failed
 if [ -d "$backup" ]; then
  if [ -d "$target" ]; then mv "$target" "$parent/.paid-to-watch-failed-$token.app"; fi
  mv "$backup" "$target"
  /usr/bin/open -a "$target" || true
 fi
 exit 1
}
trap fail HUP INT TERM
trap 'status=$?; [ "$status" -eq 0 ] || fail' EXIT
case "$token" in *[!a-f0-9-]*|'') exit 1;; esac
case "$old_pid" in *[!0-9]*|'') exit 1;; esac
case "$target" in /*/带薪看片.app|/*/捞鱼小窗.app) ;; *) exit 1;; esac
[ -d "$target/Contents" ] && [ -w "$parent" ] || fail
actual_hash=$(/usr/bin/shasum -a 256 "$package" | /usr/bin/awk '{print $1}')
[ "$actual_hash" = "$expected_hash" ] || fail
stage=$(/usr/bin/mktemp -d "$parent/.paid-to-watch-stage-XXXXXX")
/usr/bin/ditto -x -k "$package" "$stage" || fail
new="$stage/带薪看片.app"
[ -d "$new/Contents" ] || fail
new_id=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$new/Contents/Info.plist")
new_version=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$new/Contents/Info.plist")
[ "$new_id" = 'com.laoyu.paidtowatch' ] && [ "$new_version" = "$version" ] || fail
printf '{"token":"%s","status":"ready"}' "$token" > "$job/ready.json"
count=0
while [ ! -f "$job/commit.json" ]; do
 [ ! -f "$job/abort.json" ] || fail
 count=$((count+1)); [ "$count" -lt 70 ] || fail
 /bin/sleep 1
done
/usr/bin/grep -F "$token" "$job/commit.json" >/dev/null || fail
count=0
while /bin/kill -0 "$old_pid" 2>/dev/null; do
 count=$((count+1)); [ "$count" -lt 120 ] || fail
 /bin/sleep 1
done
mv "$target" "$backup" || fail
mv "$new" "$target" || fail
result installed
/usr/bin/open -a "$target" || fail
count=0
while [ "$count" -lt 90 ]; do
 /usr/bin/grep -F 'restarted' "$job/result.json" >/dev/null && exit 0
 count=$((count+1)); /bin/sleep 1
done
fail
