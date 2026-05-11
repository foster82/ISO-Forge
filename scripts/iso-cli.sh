#!/bin/bash

# iso-forge CLI helper
# Usage: ./iso-cli.sh <command> [args]

BASE_URL="http://localhost:3000/api/v1"
COOKIE_FILE=".iso-forge-cookie"

function usage() {
    echo "ISO Forge CLI"
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Commands:"
    echo "  login <username> <password>  Login and save session"
    echo "  images                       List base images"
    echo "  profiles                     List configuration profiles"
    echo "  jobs                         List recent build jobs"
    echo "  status <job_id>              Get status of a specific job"
    echo "  build <profile_id>           Trigger a new build from a profile"
    echo ""
}

function check_cookie() {
    if [ ! -f "$COOKIE_FILE" ]; then
        echo "Error: Not logged in. Run '$0 login' first."
        exit 1
    fi
}

case "$1" in
    login)
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo "Usage: $0 login <username> <password>"
            exit 1
        fi
        # We need to hit the NextAuth callback route or use a dedicated API key in the future
        # For now, this is a placeholder showing how one would use the cookie
        echo "Please log in via the web UI. Cookie-based CLI login is being implemented."
        echo "Once logged in, you can export your browser cookie to $COOKIE_FILE"
        ;;
    images)
        check_cookie
        curl -s -b "$COOKIE_FILE" "$BASE_URL/images" | jq .
        ;;
    profiles)
        check_cookie
        curl -s -b "$COOKIE_FILE" "$BASE_URL/profiles" | jq .
        ;;
    jobs)
        check_cookie
        curl -s -b "$COOKIE_FILE" "$BASE_URL/jobs" | jq .
        ;;
    status)
        if [ -z "$2" ]; then
            echo "Usage: $0 status <job_id>"
            exit 1
        fi
        check_cookie
        curl -s -b "$COOKIE_FILE" "$BASE_URL/jobs/$2" | jq .
        ;;
    build)
        if [ -z "$2" ]; then
            echo "Usage: $0 build <profile_id>"
            exit 1
        fi
        check_cookie
        curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/profiles/$2/build" | jq .
        ;;
    *)
        usage
        ;;
esac
