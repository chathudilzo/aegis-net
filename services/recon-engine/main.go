package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"
)

type ScanConfig struct {
	Zones []string `json:"zones"`
	Ports []int    `json:"ports"`
}

type ScanRequest struct {
	TargetZones []string `json:"targetZones"`
	TargetPorts []int    `json:"targetPorts"`
}

type Finding struct {
	TargetIp string `json:"targetIp"`
	Port     int    `json:"port"`
	Service  string `json:"service"`
	Status   string `json:"status"`
	Insight  string `json:"insight"`
	ScanType string `json:"scanType"`
}

var scanMutex sync.Mutex

func main() {
	fmt.Println("Aegis Recon Engine | Booting up...")

	go startAutonomousSentinel()

	fmt.Println(" Listening on Port 8081 for manual launch commands...")
	http.HandleFunc("/api/scan", handleScanRequest)

	err := http.ListenAndServe(":8081", nil)
	if err != nil {
		fmt.Printf("Engine crashed: %v\n", err)
	}
}

func fetchConfigFromBrain() (ScanConfig, error) {
	resp, err := http.Get("http://localhost:9090/api/config")
	if err != nil {
		return ScanConfig{}, err
	}
	defer resp.Body.Close()

	var config ScanConfig
	body, _ := io.ReadAll(resp.Body)
	json.Unmarshal(body, &config)

	return config, nil
}

func startAutonomousSentinel() {
	ticker := time.NewTicker(2 * time.Minute)
	defer ticker.Stop()

	fmt.Println("Autonomous Sentinel Online. Guarding networks...")

	for {
		<-ticker.C
		
		config, err := fetchConfigFromBrain()
		if err != nil || len(config.Zones) == 0 || len(config.Ports) == 0 {
			fmt.Println("[SENTINEL] Could not fetch config from Brain or config is empty. Skipping cycle.")
			continue
		}

		fmt.Println("\n[SENTINEL] Executing routine background sweep...")
		go executeSweep(config.Zones, config.Ports, "AUTO")
	}
}

func handleScanRequest(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	fmt.Println("\n[MANUAL OVERRIDE] Launch command received from Dashboard.")

	config, err := fetchConfigFromBrain()
	if err != nil {
		http.Error(w, "Cannot reach Brain for port configuration", http.StatusInternalServerError)
		return
	}

	zonesToScan := config.Zones
portsToScan := config.Ports
	if r.Method == http.MethodPost {
		var req ScanRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err == nil {
			if len(req.TargetZones) > 0 {
				fmt.Printf("Custom Target Received: %v\n", req.TargetZones)
				zonesToScan = req.TargetZones
			}
			if len(req.TargetPorts) > 0 {
				fmt.Printf("Custom Ports Received: %v\n", req.TargetPorts)
				portsToScan = req.TargetPorts
			}
		}
	}

	w.WriteHeader(http.StatusAccepted)
	w.Write([]byte("Manual scan initiated successfully."))

	go executeSweep(zonesToScan, portsToScan, "MANUAL")
}

func executeSweep(auditZones []string, portsToScan []int, scanType string) {
	scanMutex.Lock()
	defer scanMutex.Unlock()

	var masterTargetList []string

	for _, zone := range auditZones {
		ips, err := expandCIDR(zone)
		if err == nil {
			masterTargetList = append(masterTargetList, ips...)
		}
	}

	fmt.Printf("Sweeping %d IPs across %d ports (%s Scan)...\n", len(masterTargetList), len(portsToScan), scanType)

	var waitGroup sync.WaitGroup
	semaphore := make(chan struct{}, 100)

	for _, ip := range masterTargetList {
		for _, port := range portsToScan {
			waitGroup.Add(1)
			go func(targetIp string, targetPort int) {
				defer waitGroup.Done()
				semaphore <- struct{}{}
				scanSinglePort(targetIp, targetPort, scanType)
				<-semaphore
			}(ip, port)
		}
	}

	waitGroup.Wait()
	fmt.Println("Sweep Complete. Vault updated.")
}

func expandCIDR(cidr string) ([]string, error) {
	if !strings.Contains(cidr, "/") {
		return []string{cidr}, nil
	}
	ip, ipnet, err := net.ParseCIDR(cidr)
	if err != nil {
		return nil, err
	}
	var ips []string
	for ip := ip.Mask(ipnet.Mask); ipnet.Contains(ip); inc(ip) {
		ips = append(ips, ip.String())
	}
	if len(ips) > 2 {
		return ips[1 : len(ips)-1], nil
	}
	return ips, nil
}

func inc(ip net.IP) {
	for j := len(ip) - 1; j >= 0; j-- {
		ip[j]++
		if ip[j] > 0 {
			break
		}
	}
}

func scanSinglePort(ip string, port int, scanType string) {
	address := fmt.Sprintf("%s:%d", ip, port)
	connection, err := net.DialTimeout("tcp", address, 2*time.Second)
	if err != nil {
		return
	}
	connection.Close()

	serviceName := grabBanner(ip, port)
	insight := "Clean"
	if strings.Contains(serviceName, "Web Server") {
		insight = lookForSecrets(ip, port)
	}

	reportToBrain(ip, port, serviceName, insight, scanType)
}

func reportToBrain(ip string, port int, serviceName string, insight string, scanType string) {
	data := Finding{
		TargetIp: ip,
		Port:     port,
		Service:  serviceName,
		Status:   "OPEN",
		Insight:  insight,
		ScanType: scanType, 
	}
	jsonData, _ := json.Marshal(data)
	resp, err := http.Post("http://localhost:9090/api/findings", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return
	}
	defer resp.Body.Close()
}

func grabBanner(ip string, port int) string {
	address := fmt.Sprintf("%s:%d", ip, port)
	conn, err := net.DialTimeout("tcp", address, 2*time.Second)
	if err != nil {
		return "Offline"
	}
	defer conn.Close()
	conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	buffer := make([]byte, 1024)
	n, err := conn.Read(buffer)
	if err != nil {
		probe := "GET / HTTP/1.1\r\nHost: " + ip + "\r\n\r\n"
		conn.Write([]byte(probe))
		conn.SetReadDeadline(time.Now().Add(2 * time.Second))
		n, err = conn.Read(buffer)
		if err != nil {
			return "Unknown (Silent/Filtered)"
		}
	}
	response := string(buffer[:n])
	re := regexp.MustCompile(`(?i)Server:?\s+([^\r\n]+)`)
	match := re.FindStringSubmatch(response)
	if len(match) > 1 {
		return match[1]
	}
	signatures := map[string]string{
		"HTTP": "Web Server (HTTP)", "SSH": "SSH Server", "FTP": "FTP Server",
		"FATAL": "PostgreSQL Database", "MYSQL": "MySQL Database",
	}
	for key, name := range signatures {
		if strings.Contains(response, key) {
			return name
		}
	}
	return "Unrecognized Payload"
}

func lookForSecrets(ip string, port int) string {
	return "No common vulnerabilities found"
}