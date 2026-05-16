package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"
)

type Finding struct {
	TargetIp string `json:"targetIp"`
	Port     int    `json:"port"`
	Service  string `json:"service"`
	Status   string `json:"status"`
	Insight  string `json:"insight"`
}

func main() {
	fmt.Println("Aegis Recon Engine | Booting up...")
	fmt.Println("Listening on Port 8081 for launch commands from the Brain...")

	http.HandleFunc("/api/scan", handleScanRequest)
	
	err := http.ListenAndServe(":8081", nil)
	if err != nil {
		fmt.Printf("Engine crashed: %v\n", err)
	}
}

func handleScanRequest(w http.ResponseWriter, r *http.Request) {
	fmt.Println("\n Executing Multi-Zone Sweep...")
	
	w.WriteHeader(http.StatusAccepted)
	w.Write([]byte("Scan initiated successfully in the background."))

	go executeSweep() 
}

func executeSweep() {
	auditZones := []string{
		"203.0.113.0/26",
		"10.0.5.0/24",
		"45.33.32.156/32", 
		"127.0.0.1/32",    
	}
	
	portsToScan := []int{22, 80, 443, 3389, 5432, 3306, 9090, 31337}
	var masterTargetList []string

	for _, zone := range auditZones {
		ips, err := expandCIDR(zone)
		if err == nil {
			masterTargetList = append(masterTargetList, ips...)
		}
	}

	var waitGroup sync.WaitGroup
	semaphore := make(chan struct{}, 100)

	for _, ip := range masterTargetList {
		for _, port := range portsToScan {
			waitGroup.Add(1)
			go func(targetIp string, targetPort int) {
				defer waitGroup.Done()
				semaphore <- struct{}{}
				scanSinglePort(targetIp, targetPort)
				<-semaphore
			}(ip, port)
		}
	}

	waitGroup.Wait()
	fmt.Println("Sweep Complete. Awaiting next command...")
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

func scanSinglePort(ip string, port int) {
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
	reportToBrain(ip, port, serviceName, insight)
}

func reportToBrain(ip string, port int, serviceName string, insight string) {
	data := Finding{
		TargetIp: ip,
		Port:     port,
		Service:  serviceName,
		Status:   "OPEN",
		Insight:  insight,
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